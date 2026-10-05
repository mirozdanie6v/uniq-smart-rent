import os,json,base64,hashlib,pathlib,io,tarfile,subprocess,urllib.request,struct,zlib
from cryptography.hazmat.primitives import serialization,hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
token=os.environ["CLOUDFLARE_API_TOKEN"];account=os.environ["CLOUDFLARE_ACCOUNT_ID"]
assert token and account
release=json.loads(pathlib.Path(".deploy-showreel/release.enc.json").read_text())
sealed=base64.b64decode(release["sealed_private_key"])
pem=AESGCM(hashlib.sha256(("showreel-deploy-v1:"+token).encode()).digest()).decrypt(sealed[:12],sealed[12:],b"showreel-deploy-v1")
private=serialization.load_pem_private_key(pem,password=None)
key=private.decrypt(base64.b64decode(release["wrapped_key"]),padding.OAEP(mgf=padding.MGF1(hashes.SHA256()),algorithm=hashes.SHA256(),label=b"showreel-release-v1"))
cipher=base64.b64decode(release["ciphertext"])
raw=AESGCM(key).decrypt(cipher[:12],cipher[12:],b"showreel-release-v1")
assert hashlib.sha256(raw).hexdigest()==release["sha256"]
payload=json.loads(raw);assert payload["source_commit"]==release["source_commit"]
runtime=payload["secrets"];runtime["CLOUDFLARE_ACCOUNT_ID"]=account
for value in runtime.values(): print("::add-mask::"+value,flush=True)
root=pathlib.Path(os.environ["RUNNER_TEMP"])/"showreel-private-release";root.mkdir(mode=0o700)
with tarfile.open(fileobj=io.BytesIO(base64.b64decode(payload["archive"])),mode="r:gz") as tar:
    assert all(m.isfile() and not pathlib.PurePosixPath(m.name).is_absolute() and ".." not in pathlib.PurePosixPath(m.name).parts for m in tar.getmembers())
    tar.extractall(root,filter="data")
secret_path=root/"runtime-secrets.json";secret_path.write_text(json.dumps(runtime));secret_path.chmod(0o600)

import sys,shutil
subprocess.run([sys.executable,"-m","pip","install","--quiet","-r",str(root/"source/requirements.txt")],check=True)
if not shutil.which("ffmpeg"):
    subprocess.run(["sudo","apt-get","update","-qq"],check=True)
    subprocess.run(["sudo","apt-get","install","-y","-qq","ffmpeg"],check=True)
os.environ.update(runtime)
os.environ.update({"HUMAN_EDITOR_PROVIDER":"cloudflare","HUMAN_EDITOR_ROOT":str(root/"editor-data"),"SHOWREEL_WORK_DIR":str(root/"work"),"SHOWREEL_SITE_URL":"https://viiversion-showreel.lorem-ipsum.chatgpt.site","CLOUDFLARE_AI_URL":"https://viiversion-showreel-ai.mirozdanie6v.workers.dev/infer","CLOUDFLARE_VISION_MODEL":"@cf/qwen/qwen3.8-27b"})
sys.path.insert(0,str(root/"source"))
from showreel.cloud_worker import CloudClient,process_job
from showreel.engine import load_engine,require_ready
client=CloudClient(os.environ["SHOWREEL_SITE_URL"],runtime["SHOWREEL_PROCESSOR_KEY"],runtime["SHOWREEL_SITES_TOKEN"])
jid="showreel-pilot-20261005-"+os.environ["GITHUB_RUN_ID"]
pid="0c5a2b60-4af8-4b1f-a1b4-17802b3c13e5"
try:
    engine=load_engine();require_ready(engine)
    project=client.json("projects/"+pid)
    assert len(project["works"])==6 and all(w["state"]=="ready" for w in project["works"])
    settings=project["project"]["brief"]
    if isinstance(settings,str): settings=json.loads(settings)
    client.json("processor/heartbeat",{"ready":True,"detail":"FFmpeg and vision model ready; bounded pilot"})
    client.json("projects/"+pid+"/jobs",{"id":jid,"brief":settings,"choices":{"include":[],"exclude":[]}})
    job=client.json("processor/claim",{})["job"]
    assert job and job["id"]==jid
    print("PILOT_STARTED="+jid,flush=True)
    process_job(client,job,engine,root/"work")
    finished=client.json("projects/"+pid)
    result=next(j for j in finished["jobs"] if j["id"]==jid)
    assert result["state"]=="ready"
    print("PILOT_READY="+json.dumps({"job":jid,"duration":result["result"]["duration"],"candidates":len(result["result"]["candidates"]),"timeline":len(result["result"]["timeline"])}),flush=True)
except Exception as error:
    import traceback
    print("PILOT_FAILED="+type(error).__name__+" status="+str(getattr(error,"code","none"))+" attribute="+str(getattr(error,"name",None)),flush=True)
    print("PILOT_TRACE="+json.dumps([{"file":pathlib.Path(f.filename).name,"line":f.lineno,"function":f.name} for f in traceback.extract_tb(error.__traceback__)]),flush=True)
    raise SystemExit(1)
finally:
    try: client.json("processor/heartbeat",{"ready":False,"detail":"Bounded pilot finished; permanent container pending"})
    except Exception: pass
    secret_path.unlink(missing_ok=True)
