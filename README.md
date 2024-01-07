# kv30

> A key/value storage (of objects) with change watching

## Installation

```bash
npm i --save kv30
```

## Usage

```js
const kv30 = require('kv30');

kv30.init();

const data = kv30.get('settings'); // loads json from ./data/settings.json

data.newProps='prop';

//...
// will save changes in next 30 seconds to ./data/settings.json
// ...
```

## Motivation for this module

I needed simple and dependence-free data storage for my prof-of-concept projects, that can be replaced with db or something later (in case of hight load). Also I do not want to create data layer/api layer, so I store all data at json files and don't mind if I loose data for the last 30 secons. 

Technically it is **in-memory cache** with disk persistance.

## Readonly case
```js
const data = kv30.getRO('settings'); // returns deep-freezed object
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

## Another storage

You can create non-file storage, that exports `connect`, `load`, `save` methods (looks at `storage.file.js`)
```js
kv30.init({storage: newStorage})
```

## License

MIT