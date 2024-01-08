# kv30

> A local key/value storage with change watching

## Installation

```bash
npm i --save kv30
```

## Usage

```js
const kv30 = require('kv30');
kv30.init();

// load json from ./data/settings.json
const data = kv30.get('settings'); 

// use and change data
data.newProp='123';

//...
// kv30 will automatically save changes 
// in next 30 seconds to ./data/settings.json
// ...
```

## Motivation for this module

I needed simple and dependence-free data storage for my prof-of-concept projects, that can be replaced with DB or something later. Also I don't mind if I loose data for the last 30 secons.

Technically it is **in-memory cache** with disk persistance, that watches data change and flushes it to disk.

## Readonly case
```js
const data = kv30.getRO('settings'); // returns deeply freezed object
```

## Configuration
```js
const kv30 = require('kv30');
const storageFile = require('kv30/storage.file');
storageFile.setProps({
    dataFolder:'./', // change data folder
});
kv30.init({
    savePeriod:10, // flush changes every 10 seconds 
    logger:()=>{}  // no logs about load/save/errors
});

```

## Check data health
```js
// can set default value 
// (for that case when file is not available)
let data = kv30.get('settings', {data:[]});

// or can handle data status
//    readonly  - readonly data (getRO used)
//    changed   - data was changed and it is not saved yet
//    loadError - loading falied; will not save changes
//    saveError - saving failed
//    initError - not initialized (get/getRO/set was not called)
if (kv30.getStatus('settings').loadError) {
    data = kv30.set('settings', {data:[]});
}
```

## Custom storage

You can use custom storage, that exports `connect`, `load` and async `save` methods (looks at `storage.file.js`)
```js
kv30.init({storage: customStorage})
```

## License

MIT