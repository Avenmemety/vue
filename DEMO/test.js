const a = {
    name: 1,
    id: 2,
    sex:3
}

Object.keys(a).forEach(key => {
    Object.defineProperty(this, key, {
        configurable: false,
        enumerable: true,
        get() {
            console.log('get')
            return a[key]
        },
        set(val) {
            console.log('set')
            a[key] = val
        }
    })
})

console.log(this.name)