const cacheInFlight = new Map();
async function test() {
    let promise = cacheInFlight.get('test');
    if (!promise) {
        promise = Promise.resolve("buffer");
        promise.finally(() => cacheInFlight.delete('test'));
        cacheInFlight.set('test', promise);
    }
    const buffer = await cacheInFlight.get('test');
    console.log(buffer);
}
test();
