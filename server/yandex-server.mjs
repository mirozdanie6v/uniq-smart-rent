import http from 'node:http';
import pg from 'pg';
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const port=Number(process.env.PORT||8080);
const json=(res,data,status=200)=>{const body=JSON.stringify(data);res.writeHead(status,{'content-type':'application/json; charset=utf-8'});res.end(body)};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
    if(url.pathname==='/api/health'){await pool.query('SELECT 1');json(res,{ok:true,service:'auto-sale-yandex',persistence:'postgresql'});return}
    json(res,{error:'not_found'},404);
  }catch(error){console.error(error);json(res,{error:'internal_error'},500)}
});
server.listen(port,'0.0.0.0',()=>console.log(`AUTO SALE Yandex listening on ${port}`));
