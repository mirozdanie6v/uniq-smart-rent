import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const details=fs.readFileSync(new URL('../public/auto-sale-car-details.mjs',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/auto-sale-car-details.css',import.meta.url),'utf8');

const ids=['bmw-x5-22','tesla-y-23','rav4-22','mustang-mach-e','gle-21','lexus-rx-22','bmw-x3-23','audi-q5-22','porsche-macan-21','volvo-xc60-22','honda-crv-23','mazda-cx5-23','jeep-grand-cherokee-22','subaru-outback-23','tesla-model3-23','cadillac-xt5-22'];

test('rich detail registry covers all sixteen catalog cars',()=>{
  for(const id of ids)assert.match(details,new RegExp(`id:'${id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}'`));
  assert.equal((details.match(/\{id:'/g)||[]).length,16);
});

test('every rich car detail includes useful technical and customer information',()=>{
  for(const field of ['body:','power:','engine:','transmission:','drive:','seats:','efficiency:','highlights:','safety:','bestFor:'])assert.match(details,new RegExp(field.replace(':','\\:')));
  assert.match(details,/Точная комплектация, состояние, история, пробег и опции конкретного автомобиля подтверждаются по VIN/);
});

test('car photo and both detail button types open the unified rich modal',()=>{
  assert.match(details,/\.auto-car \.auto-car-media/);
  assert.match(details,/\[data-detail\],\[data-extra-detail\]/);
  assert.match(details,/data-car-photo-detail/);
  assert.match(details,/data-car-detail-bg/);
});

test('rich details are keyboard accessible and responsive assets are loaded',()=>{
  assert.match(details,/\['Enter',' '\]/);
  assert.match(details,/role','button'/);
  assert.match(index,/auto-sale-car-details\.css/);
  assert.match(index,/auto-sale-car-details\.mjs/);
  assert.match(css,/@media\(max-width:760px\)/);
});
