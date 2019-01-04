Reimplementation of the concepts in here, with a focus on the external API first and foremost (clean, few type annotations, fully type safe, and possible to use with multiple stores).

## Design Questions

### Types first or last?

Should a saga be declared with it's watcher, making it easy to give it implicit types? Or should the saga better be declared as is, and then has to match the signature of the watcher to be accepted into the program?

### Is this even a problem worth solving?

Given that a majority of sagas are just orchestrating (dependent) data loading requests, wouldn't it make more sense to put effort into another kind of data loading (View driven APIs, GraphQL, etc.)?
