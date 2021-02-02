// example-directory/example.ts

/*
    File is simply instructional for how our libraries are written, delete before committing.
*/

// Types should be created as UpperCamelCase
type ZeroType = 0;

// Constants outside of functions & classes should be created as UPPER_CASE_UNDERSCORE_SEPARATED
const GLOBAL_CONST: ZeroType = 0;

// Interfaces should be created as UpperCamelCase
export interface ExampleInterface {
  exampleNumber: number;
}

/**
 * @param exampleObject a quick definition of what exampleObject use is, if it isn't implicit enough already
 */
export default function (exampleObject: ExampleInterface): number {
  /**
   * A Quick description of what exampleFunction does, if it isn't implicit enough already
   */

  // Constants inside of a function should be created as camelCase
  const incrementedExampleNumber = exampleObject.exampleNumber + 1;

  return incrementedExampleNumber + GLOBAL_CONST;
}
