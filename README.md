# kv30

> Object persistent storage with change watching

![tests](https://github.com/artemdudkin/kv30/actions/workflows/node.js.yml/badge.svg) [![codecov](https://codecov.io/gh/artemdudkin/kv30/graph/badge.svg?token=CKD0CA3VU7)](https://codecov.io/gh/artemdudkin/kv30)

## Motivation for this module

I needed simple and dependence-free data storage for my prof-of-concept projects, that can be replaced with DB or something later. (Also I don't mind if I lose data of the last few seconds).

Technically it is **in-memory cache** with disk persistance, that watches data change and flushes it to disk.


## Installation

```bash
npm i --save kv30
```

## Usage

```js
const kv30 = require('kv30');

await kv30.init();

// load json from ./data/settings.json
const data = await kv30.get('settings'); 

// use and change data
data.newProp='123';

//...
// kv30 will automatically save changes of data
// in next 30 seconds to ./data/settings.json
// ...
```

## Readonly case
```js
const data = await kv30.get('settings', {readonly:true}); // returns deeply freezed object
```

## Configuration
```js
const kv30 = require('kv30');
const storageFile = require('kv30/storage.file');
storageFile.setProps({
    dataFolder:'./', // change data folder
});
kv30.init({
    savePeriod: 10, // flush changes every 10 seconds 
    logger: ()=>{}, // no logs about load/save/errors
    readonly: true, // all data is readonly (cannot change and save)
});

```

## Check data health
```js
let data = await kv30.get('settings');

// handling data status
//    readonly  - readonly data
//    changed   - data was changed and it is not saved yet
//    loadError - loading falied; will not save changes
//    saveError - saving failed
//    initError - not initialized (get/set was not called)
if (kv30.getStatus('settings').loadError) {
    data = await kv30.set('settings', {data:[]}); // set default value
}
```

## Custom storage

You can use custom storage, that exports `connect`, `load`, `save` methods (looks at `storage.file.js`)
```js
await kv30.init({storage: customStorage})
```

## License

MIT
