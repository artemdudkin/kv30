const fs = require('fs');
const path = require('path');


let DATA_FOLDER = './data/'
let READONLY = false;
let L = console.log; // log to console by default


function setProps(opt) { // {
                         //   dataFolder, // {String}
                         //   logger,     // {Function}
                         //   readonly,   // {Boolean}
                         // }
  if (opt && opt.dataFolder) {
    L(`kv30.file DATA_FOLDER was updated [${opt.dataFolder}]`);
    DATA_FOLDER = opt.dataFolder
  }

  if (opt && opt.readonly) {
    L(`kv30.file READONLY was updated [${opt.readonly}]`);
    READONLY = opt.readonly
  }

  if (opt && opt.logger) {
    if (typeof opt.logger !== 'function') {
      L('kv30.file.opt.logger is not a function');
    } else {
      L('kv30.file logger was updated');
      L = opt.logger
    }
  }
}

// Get random string of length N
// (from https://stackoverflow.com/a/77486780/4486609)
function _rnd(n) {
  return Array.from({ length: n }, i => String.fromCharCode(Math.round(Math.ceil(Math.random() * 25) + 65))).join('');
}


function connect() {
  // check existance of DATA_FOLDER and create one if not exists and not readonly
  if (!fs.existsSync(DATA_FOLDER)) {
    if (READONLY) {
      L('kv30.file DATA_FOLDER does not exists');
    } else {
      L('kv30.file DATA_FOLDER does not exists, will create one');
      fs.mkdirSync(DATA_FOLDER, {recursive: true});
    }
  }

  // is it possible to create file at DATA_FOLDER
  if (!READONLY) {
    let fn = path.join(DATA_FOLDER, 'tmp.'+_rnd(13)+'.json');
    fs.writeFileSync(fn, '{}');
    fs.rmSync(fn);
  }
}


function load(name) {
    let fn = path.join(DATA_FOLDER, name+'.json');
    return JSON.parse(fs.readFileSync(fn).toString());
}


// @returns Promise
function save(name, data) {
  if (READONLY) {
    return Promise.reject('cannot save to readonly connection');
  } else {
    return new Promise((resolve, reject) => {
      let fn = path.join(DATA_FOLDER, name+'.json');
      let text = JSON.stringify(data, null, 4);
      fs.writeFile(fn, text, (err)=> {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      });
    })
  }
}


module.exports = {
  setProps,
  connect,
  load,
  save, //async
}