
module.exports = function watchedObject(obj, opt, parentName='') { // opt = {logGet, logSet, logDelete}
  return new Proxy(obj, {
    get(target, prop, receiver) {
      if (opt && opt.logGet) opt.logGet(parentName+'.'+prop);
      let o = Reflect.get(target, prop, receiver);
      if (typeof o === 'object') {
        return watchedObject(o, opt, parentName+'.'+prop);
      } else {
        return o;
      }
    },
    set(target, prop, val, receiver) {
      if (opt && opt.logSet) opt.logSet(parentName+'.'+prop, val);
      return Reflect.set(target, prop, val, receiver);
    },
    deleteProperty(target, prop, receiver) {
      if (opt && opt.logDelete) opt.logDelete(parentName+'.'+prop);
      return Reflect.deleteProperty(target, prop, receiver);
    }, 
  });
}

/*

let ouser = {
 a: 1, 
 b: [1, 2],
 c: {d:1, e:4},
}

let user = watchedObject(ouser, {logSet:(name,val)=>console.log(`SET ${name}=${JSON.stringify(val)}`), logDelete:(name)=>console.log(`DELETE ${name}`)})

user.a=2;
console.log('---');
user.b=[3, 4]
console.log('---');
user.b.length=3
console.log('---');
user.b.push(5)
console.log('---');
user.b.splice(2,1);
//console.log('---');
//user.b.length=6;
//user.b.copyWithin(3, 0);
//console.log('---');
//user.b.pop();
//console.log('---');
//user.b.shift();
console.log('---');
user.c.d='2'
console.log('---');
delete user.c.e;
console.log('---');
delete user.c;
console.log('---');
user.c = {x:'x'};

console.log(ouser)

//let x = 2
//console.log(watchedObject(2))

*/