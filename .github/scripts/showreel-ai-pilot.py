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
directory=root/"cloudflare/processor"
(directory/"relay.mjs").write_text("export default {\n async fetch(request,env) {\n  if(new URL(request.url).pathname!=='/infer')return new Response(null,{status:404});\n  if(!env.SHOWREEL_PROCESSOR_KEY||request.headers.get('Authorization')!=='Bearer '+env.SHOWREEL_PROCESSOR_KEY)return new Response(null,{status:401});\n  if(request.method!=='POST')return new Response(null,{status:405});\n  const raw=await request.text();if(raw.length>8*1024*1024)return new Response(null,{status:413});\n  try {\n   const input=JSON.parse(raw);if(input.model!==env.CLOUDFLARE_VISION_MODEL||!Array.isArray(input.messages))return new Response(null,{status:400});\n   const result=await env.AI.run(env.CLOUDFLARE_VISION_MODEL,{messages:input.messages,stream:false,temperature:0.1,max_tokens:Math.min(input.max_completion_tokens||2400,2400),response_format:input.response_format||{type:'json_object'},chat_template_kwargs:{enable_thinking:false}});\n   return Response.json(result);\n  }catch(error){console.warn('vision-unavailable',error?.name||'Error');return Response.json({error:'Vision unavailable'},{status:503});}\n }\n};")
config={"name":"viiversion-showreel-ai","main":"relay.mjs","compatibility_date":"2026-10-04","ai":{"binding":"AI"},"vars":{"CLOUDFLARE_VISION_MODEL":"@cf/qwen/qwen3.8-27b"}}
(directory/"relay.json").write_text(json.dumps(config))
secret_path.write_text(json.dumps({"SHOWREEL_PROCESSOR_KEY":runtime["SHOWREEL_PROCESSOR_KEY"]}))
subprocess.run(["npm","ci","--no-fund","--no-audit"],cwd=directory,check=True)
subprocess.run(["npx","wrangler","deploy","--config","relay.json"],cwd=directory,check=True)
subprocess.run(["npx","wrangler","secret","bulk",str(secret_path),"--config","relay.json"],cwd=directory,check=True)
url="https://viiversion-showreel-ai.mirozdanie6v.workers.dev"
def chunk(name,data): return struct.pack(">I",len(data))+name+data+struct.pack(">I",zlib.crc32(name+data)&0xffffffff)
png=b"\x89PNG\r\n\x1a\n"+chunk(b"IHDR",struct.pack(">IIBBBBB",32,32,8,2,0,0,0))+chunk(b"IDAT",zlib.compress((b"\0"+b"\xff\0\0"*32)*32))+chunk(b"IEND",b"")
probe={"model":config["vars"]["CLOUDFLARE_VISION_MODEL"],"max_completion_tokens":120,"messages":[{"role":"user","content":[{"type":"text","text":"Identify the dominant image color in English. Return JSON with one field: color."},{"type":"image_url","image_url":{"url":"data:image/png;base64,"+base64.b64encode(png).decode()}}]}]}
req=urllib.request.Request(url+"/infer",data=json.dumps(probe).encode(),headers={"Authorization":"Bearer "+runtime["SHOWREEL_PROCESSOR_KEY"],"Content-Type":"application/json"})
try:
    with urllib.request.urlopen(req,timeout=240) as response: result=json.load(response)
    print("BINDING_VISION_PROBE="+json.dumps(result)[:2500],flush=True)
except Exception as error:
    print("BINDING_VISION_PROBE_FAILED="+str(getattr(error,"code",type(error).__name__)),flush=True)
    raise SystemExit(1)
finally: secret_path.unlink(missing_ok=True)
print("AI_RELAY_URL="+url,flush=True)
