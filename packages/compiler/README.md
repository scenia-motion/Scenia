# @scenia-runtime/compiler

Placeholder package for a future compiler layer.

The first phase of this experiment uses AssemblyScript directly. Example code
imports AS3-inspired classes from `@scenia-runtime/runtime-as` and compiles
that AssemblyScript source to WebAssembly with `asc`.

Later, this package may transform AS3-like syntax into AssemblyScript so user
programs can move closer to classic AS3 ergonomics without requiring the runtime
to emulate Flash or parse SWF files.

Out of scope for this MVP:

- a full ActionScript 3 compiler
- SWF parsing
- Flash player compatibility
- visual editor tooling

The package contains a tiny typed placeholder export so workspace builds verify
the TypeScript configuration from the beginning.
