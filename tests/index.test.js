console.log = jest.fn(console.log);
const {init, deinit, get, set, getStatus} = require('../index');


describe('index.js', ()=>{

  beforeEach(()=>{
    jest.useFakeTimers();
  })

  afterEach(()=>{
    deinit();
    jest.clearAllMocks();
  })


  it('connect with inappropiate storage - init throws error', async () => {
    let err;
    try {
      await init({
        storage:{
          connect:1,
          load:2,
          save:3,
        }
      })
    } catch (e) {
      err = e;
    }

    expect(err).toEqual('kv30.opt.storage is inappopriate');
    expect(console.log.mock.calls[0]).toEqual(['kv30.opt.storage.connect is not a function']);
    expect(console.log.mock.calls[1]).toEqual(['kv30.opt.storage.load is not a function']);
    expect(console.log.mock.calls[2]).toEqual(['kv30.opt.storage.save is not a function']);
  });


  it('connect with inappropiate logger - init throws error', async () => {
    let err;
    try {
      await init({logger:1})
    } catch (e) {
      err = e;
    }
    await process.nextTick();

    expect(err).toEqual('kv30.opt.logger is not a function');
    expect(console.log.mock.calls[0]).toEqual(['kv30.opt.logger is not a function']);
  });


  it('connect with inappropiate savePeriod - cause log message', async () => {
    await init({
      savePeriod:0,
      storage: {
        connect:()=>{},
        load: ()=>{},
        save: ()=>{},
      }
    })

    expect(console.log.mock.calls[0]).toEqual(['kv30.opt.savePeriod should be >=1 seconds, will use default [30]']);
  });


  it('connect returns rejected Promise - init throws error', async () => {
    let err;

    try {
      await init({
        storage: {
          connect:()=>Promise.reject('error'),
          load: ()=>{},
          save: ()=>{},
        }
      })
    } catch (e) {
      err = e;
    }

    expect(err).toEqual('error');
  });


  it('connect throws error - init throws error', async () => {
    let err;

    try {
      await init({
        storage: {
          connect:()=>{throw new Error('error2')},
          load: ()=>{},
          save: ()=>{},
        }
      })
    } catch (e) {
      err = e;
    }

    expect(err).toEqual(new Error('error2'));
  });


  it('getStatus before get or set - returns initError', async () => {
    await init({
      storage: {
        connect:()=>{},
        load: ()=>{},
        save: ()=>{},
      }
    })

    let status = getStatus('x');

    expect(status).toEqual({initError:true})
  })


  it('get (load returns non-object) - returns {}', async () => {
    await init({
      storage: {
        connect:()=>{},
        load: ()=>{},
        save: ()=>{},
      }
    })

    const x = await get('x');
    const status = getStatus('x');

    expect(x).toEqual({});
    expect(status).toEqual({changed: false, loadError: "not an object"});
  });

  
  it('get (load exception) - returns {}', async () => {
    await init({
      storage: {
        connect:()=>{},
        load: ()=>{throw new Error('boom!')},
        save: ()=>{},
      }
    })

    const x = await get('x');
    const status = getStatus('x');

    expect(x).toEqual({});
    expect(status).toEqual({changed: false, loadError: new Error('boom!')});
  });


  it('get - causes load', async () => {
    const storage = {
      connect:jest.fn(()=>{}),
      load: jest.fn(()=>({a:1})),
      save: jest.fn(()=>{}),
    }
    await init({
      storage
    })

    const x = await get('x'); 
    const status = getStatus('x');

    expect(x).toEqual({a:1});
    expect(status).toEqual({changed: false});
    expect(storage.connect).toBeCalledTimes(1);
    expect(storage.load).toBeCalledTimes(1);
    expect(storage.load.mock.calls[0]).toStrictEqual(['x']);
    expect(storage.save).toBeCalledTimes(0);
  });


  it('set and get - does not cause load', async () => {
    const storage = {
      connect:jest.fn(()=>{}),
      load: jest.fn(()=>({a:1})),
      save: jest.fn(()=>{}),
    }
    await init({
      storage
    })

    await set('x', {b:'b'});
    const x = await get('x');

    expect(x).toEqual({b:'b'});
    expect(storage.connect).toBeCalledTimes(1);
    expect(storage.load).toBeCalledTimes(0);
    expect(storage.save).toBeCalledTimes(0);
  });


  it('set - causes save in 30 sec', async () => {
    const storage = {
      connect:jest.fn(()=>{}),
      load: jest.fn(()=>({a:1})),
      save: jest.fn(()=>{}),
    }
    await init({
      storage
    })

    await set('x', {b:'b'});
    const status = getStatus('x');

    expect(status).toEqual({changed: true});
    expect(storage.connect).toBeCalledTimes(1);
    expect(storage.load).toBeCalledTimes(0);
    expect(storage.save).toBeCalledTimes(0);

    jest.advanceTimersByTime(31000);
    await process.nextTick(); // don't know why but it stops in storage.save until all expects called

    const status2 = getStatus('x');

    expect(status2).toEqual({changed: false});
    expect(storage.connect).toBeCalledTimes(1);
    expect(storage.load).toBeCalledTimes(0);
    expect(storage.save).toBeCalledTimes(1);
    expect(storage.save.mock.calls[0]).toStrictEqual(['x', {b:'b'}]);
  });


  it('get - does not cause save in 30 sec', async () => {
    const storage = {
      connect:jest.fn(()=>{}),
      load: jest.fn(()=>({a:1})),
      save: jest.fn(()=>{}),
    }
    await init({
      storage
    })

    await get('x');

    expect(storage.connect).toBeCalledTimes(1);
    expect(storage.load).toBeCalledTimes(1);
    expect(storage.save).toBeCalledTimes(0);

    jest.advanceTimersByTime(31000);

    expect(storage.connect).toBeCalledTimes(1);
    expect(storage.load).toBeCalledTimes(1);
    expect(storage.save).toBeCalledTimes(0);
  });


  it('change of object - causes save', async () => {
    const storage = {
      connect:jest.fn(()=>{}),
      load: jest.fn(()=>({a:1, b:2})),
      save: jest.fn(()=>{}),
    }
    await init({
      storage
    })

    let x = await get('x');
    x.a=2;
    x.c=3;
    delete x.b

    expect(storage.save).toBeCalledTimes(0);

    jest.advanceTimersByTime(31000);

    expect(storage.save).toBeCalledTimes(1);
    expect(storage.save.mock.calls[0]).toStrictEqual(['x', {a:2, c:3}]);
  });


  it('change of object somewhere in the deep - causes save', async () => {
    const storage = {
      connect:jest.fn(()=>{}),
      load: jest.fn(()=>({a:{b:{c:{d:1}}}})),
      save: jest.fn(()=>{}),
    }
    await init({
      storage
    })

    let x = await get('x');
    x.a.b.c.d=2;

    expect(storage.save).toBeCalledTimes(0);

    jest.advanceTimersByTime(31000);

    expect(storage.save).toBeCalledTimes(1);
    expect(storage.save.mock.calls[0]).toStrictEqual(['x', {a:{b:{c:{d:2}}}}]);
  });


  it('readonly get - cannot change object', async () => {
    const storage = {
      connect:jest.fn(()=>{}),
      load: jest.fn(()=>({a:1, b:2})),
      save: jest.fn(()=>{}),
    }
    await init({
      storage
    })

    let x = await get('x', {readonly:true});
    let status = getStatus('x')
    x.a=2;
    x.c=3;
    delete x.b

    expect(x.a).toEqual(1);
    expect(x.b).toEqual(2);
    expect(x.c).toEqual(undefined);
    expect(storage.save).toBeCalledTimes(0);
    expect(status).toEqual({changed:false, readonly:true});

    jest.advanceTimersByTime(31000);

    expect(storage.save).toBeCalledTimes(0);
  });


  it('set after readonly get - cannot change object', async () => {
    const storage = {
      connect:jest.fn(()=>{}),
      load: jest.fn(()=>({a:1, b:2})),
      save: jest.fn(()=>{}),
    }
    await init({
      storage
    })

    let x = await get('x', {readonly:true});
    x = await set('x', {c:3})
    let status = getStatus('x')

    expect(x.a).toEqual(1);
    expect(x.b).toEqual(2);
    expect(x.c).toEqual(undefined);
    expect(storage.save).toBeCalledTimes(0);
    expect(status).toEqual({changed:false, readonly:true});

    jest.advanceTimersByTime(31000);

    expect(storage.save).toBeCalledTimes(0);
  });


  it('readonly set - cannot change object', async () => {
    const storage = {
      connect:jest.fn(()=>{}),
      load: jest.fn(()=>{}),
      save: jest.fn(()=>{}),
    }
    await init({
      storage
    })

    let x = await set('x', {a:1, b:2}, {readonly:true});
    let status = getStatus('x');
    x.a=2;
    x.c=3;
    delete x.b

    expect(x.a).toEqual(1);
    expect(x.b).toEqual(2);
    expect(x.c).toEqual(undefined);
    expect(storage.save).toBeCalledTimes(0);
    expect(status).toEqual({changed:false, readonly:true});

    jest.advanceTimersByTime(31000);

    expect(storage.save).toBeCalledTimes(0);
  });

})

