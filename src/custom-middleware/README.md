Reimplementation of the concepts in here, with a focus on the external API first and foremost (clean, few type annotations, fully type safe, and possible to use with multiple stores).

## Design Questions

### Types first or last?

Should a saga be declared with it's watcher, making it easy to give it implicit types? Or should the saga better be declared as is, and then has to match the signature of the watcher to be accepted into the program?

### Is this even a problem worth solving?

Given that a majority of sagas are just orchestrating (dependent) data loading requests, wouldn't it make more sense to put effort into another kind of data loading (View driven APIs, GraphQL, etc.)?

### How to call from one saga to another / helper function?

It would be a hassle to compose the individual parts of the context (`call`, `put`, `select`, etc.) back into a context object, in order to pass it to the next function.

If one didn't "unpack" the object, it would be easy to forward, but the usage more verbose (`ctx.call`, `ctx.put`, etc.).

Also the helper's function signature must be explicitly stated, which would be quite verbose wihtout helpers like `forEvery`.

### Is there an alternative approach to mock functions?

Would probably required globals again (not explicit passing of the context/environment), which would break it down to a single store.
