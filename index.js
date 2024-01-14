/**
 * Loads and converts to json by get(); from files by default
 * Watch changes and saves every N seconds if it was changed
 * Readonly options can be used (see get(..., {readonly:true}), set(..., {readonly:true}))
 */

const fs = require('fs');
const storageFile = require('./storage.file');
const watchedObject = require('./util.watchedObject');
const deepFreeze = require('./util.deepFreeze');

let SAVE_PERIOD = 30; // flush data every 30 seconds
let STORAGE = storageFile; // save data to files
let L = console.log; // log to console

let o = {}; // {name:{         // {String} data object name
              //     data,       // {Object}
              //     changed,    // {Boolean} was changed and will be saved soon
              //     loadError,  // {String}
              //     saveError   // {String}
              //     initError   // {Boolean} never initialized (get/set was not called)
              //  }, ...}
let saving = {}; // {name:<boolean>, ...} // object of this name is in the saving process right now
let timer;


async function get(name, opt) { // opt = {readonly}
  name = '' + name
  let ro = ((opt && typeof opt.readonly !== 'undefined') 
             ? !!opt.readonly 
             : false)

  if (!o[name]) {
    await _load(name);
    if (ro) o[name].readonly=true
  }

  return (ro ? deepFreeze(o[name].data) : _getWatchedObject(name))
}


function getStatus(name) {
  name = '' + name
  if (!o[name]) {
    return {
      initError:true
    }
  }
  return {
    readonly : o[name].readonly,
    changed  : o[name].changed,
    loadError: o[name].loadError,
    saveError: o[name].saveError,
  }
}


async function set(name, data, opt) { // opt = {readonly}
  name = '' + name

  if (o[name] && o[name].readonly) {
    return get(o[name])
  }

  let ro = ((opt && typeof opt.readonly !== 'undefined') 
             ? !!opt.readonly 
             : o[name] 
                ? o[name].readonly 
                : false)

  o[name] = {
    data,
    changed: !ro,
    ...(ro ? {readonly:true}:{})
  }
  return (ro ? deepFreeze(o[name].data) : _getWatchedObject(name))
}


async function init(opt) { // opt = {
                           //    logger,     // {Function}
                           //    savePeriod, // {Integer}
                           //    readonly,   // {Boolean} all data is readonly
                           //    storage:{
                           //      connect,  // {Async Function, reqiured}
                           //      load,     // {Async Function, reqiured}
                           //      save      // {Async Function, reqiured}
                           // }
  deinit();

  if (opt && typeof opt.savePeriod !== 'undefined') {
    if (typeof opt.savePeriod !== 'number' || !Number.isInteger(opt.savePeriod)) {
      L('kv30.opt.savePeriod should be integer');
    } else if (opt.savePeriod < 1) {
      L(`kv30.opt.savePeriod should be >=1 seconds, will use default [${SAVE_PERIOD}]`);
    } else {
      L(`kv30 SAVE_PERIOD was updated [${opt.savePeriod}]`);
      SAVE_PERIOD = opt.savePeriod
    }
  }

  if (opt && opt.storage) {
    let ok1 = (opt.storage.connect && typeof opt.storage.connect === 'function')
    let ok2 = (opt.storage.load && typeof opt.storage.load === 'function')
    let ok3 = (opt.storage.save && typeof opt.storage.save === 'function')
    if (!ok1 || !ok2 || !ok3) {
      if (!ok1) L('kv30.opt.storage.connect is not a function');
      if (!ok2) L('kv30.opt.storage.load is not a function');
      if (!ok3) L('kv30.opt.storage.save is not a function');
      return Promise.reject('kv30.opt.storage is inappopriate');
    } else {
      L('kv30 storage was updated');
      STORAGE = opt.storage
    }
  }

  if (opt && opt.logger) {
    if (typeof opt.logger !== 'function') {
      L('kv30.opt.logger is not a function');
      return Promise.reject('kv30.opt.logger is not a function')
    } else {
      L('kv30 logger was updated');
      L = opt.logger
    }
  }

  let s = Date.now();
  await STORAGE.connect();
  timer = setInterval(_saveChanged, SAVE_PERIOD*1000)
  L(`kv30 was initialized, ${Date.now()-s} ms`)
}


function deinit(){
  // clear global state
  SAVE_PERIOD = 30;
  STORAGE = storageFile;
  L = console.log;
  o = {}
  saving = {}

  // clear timers  
  if (timer) clearInterval(timer);
  timer = undefined; 
}


function _saveChanged(){
  Object.keys(o).forEach(name => {
    if (o[name].changed) {
      _save(name);
    }
  })
}


async function _load(name) {
  let data = {};
  let loadError;
  let changed = false;

  try {
    let s = Date.now();
    data = await STORAGE.load(name);
    if (typeof data !== 'object') {
      data = {}
      loadError = 'not an object'
      L(`kv30 [data:${name}] *NOT* loaded (not an object), ${Date.now()-s} ms`);
    } else {
      L(`kv30 [data:${name}] loaded, ${Date.now()-s} ms`);
    }
  } catch (e) {
    data = {};
    loadError = e;
    L(`kv30 [data:${name}] *NOT* loaded (error)`);
    L(e);
  }
  o[name] = {
    data,
    loadError,
    changed
  }
}


async function _save(name) {

  if (!o[name]) {
    L(`kv30 [data:${name}] *NOT* saved (not found)`);
    return;
  }

  if (o[name].readonly) {
    L(`kv30 [data:${name}] *NOT* saved (readonly)`);
    return;
  }

  if (o[name].loadError) {
    L(`kv30 [data:${name}] *NOT* saved (failed to load)`);
    return;
  }

  if (saving[name]) {
    L(`kv30 [data:${name}] *NOT* saved (too busy)`);
    return;
  }

  saving[name] = true;

  try {
    let s = Date.now();
    await STORAGE.save(name, o[name].data);
    o[name].changed = false;
    o[name].saveError = undefined;
    L(`kv30 [data:${name}] saved, ${Date.now()-s} ms`);
  } catch (e) {
    o[name].saveError = e;
    L(`kv30 [data:${name}] *NOT* saved (error)`);
    L(e);
  }
  
  delete saving[name];
}


function _getWatchedObject(name) {
  return watchedObject(
    o[name].data, 
    {  
      logSet:(fieldName, val)=>{
//        console.log(`SET ${fieldName}=${JSON.stringify(val)}`)
        o[name].changed=true
      }, 
      logDelete:(fieldName)=>{
//        console.log(`DELETE ${fieldName }`)
         o[name].changed=true
      }
    }
  )
}


module.exports = {
  init, // async
  deinit,
  get,  // async
  set,  // async
  getStatus,
}