# Changelog


## v0.2.1

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.2.0...v0.2.1)

### 🚀 Enhancements

- Update getDocumentTypes method to return DocumentTypesResponse type ([f3a2884](https://github.com/Ripwords/MyInvoisClient/commit/f3a2884))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.2.0

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.1.7...v0.2.0)

### 🚀 Enhancements

- Add TIN search and QR code retrieval functionalities to taxpayer validation API ([b423bc3](https://github.com/Ripwords/MyInvoisClient/commit/b423bc3))

### 💅 Refactors

- Enhance MyInvoisClient with new document type methods and improve TIN validation documentation ([14ac780](https://github.com/Ripwords/MyInvoisClient/commit/14ac780))
- Modularize MyInvoisClient by integrating document management APIs ([9f37f6d](https://github.com/Ripwords/MyInvoisClient/commit/9f37f6d))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.1.7

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.1.6...v0.1.7)

### 🏡 Chore

- Clean up dependencies by removing unused packages and updating external configurations ([886c95c](https://github.com/Ripwords/MyInvoisClient/commit/886c95c))
- Add 'dist' directory to package.json files for improved module exports ([c52ed75](https://github.com/Ripwords/MyInvoisClient/commit/c52ed75))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.1.6

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.1.5...v0.1.6)

### 🏡 Chore

- Update release scripts to ensure consistency by removing 'bun' from publish commands for public access ([4bd352f](https://github.com/Ripwords/MyInvoisClient/commit/4bd352f))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.1.5

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.1.4...v0.1.5)

### 🏡 Chore

- Update release scripts to include 'bun publish' for public access after changelog generation ([3ace843](https://github.com/Ripwords/MyInvoisClient/commit/3ace843))
- Update release scripts to use 'npm publish' instead of 'bun publish' for public access after changelog generation ([cd6854f](https://github.com/Ripwords/MyInvoisClient/commit/cd6854f))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.1.4

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.1.3...v0.1.4)

### 💅 Refactors

- Extend RegistrationType to include 'ARMY' and update related interfaces in documents.d.ts and index.ts for improved type safety ([955ccee](https://github.com/Ripwords/MyInvoisClient/commit/955ccee))

### 🏡 Chore

- Update release scripts to remove npm publish command and ensure git push follows changelog generation ([ba56b4a](https://github.com/Ripwords/MyInvoisClient/commit/ba56b4a))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.1.3

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.1.2...v0.1.3)

### 💅 Refactors

- Add industry classification fields to Supplier interface in documents.d.ts, update invoice generation logic in document.ts, and enhance related tests for improved type safety and clarity ([648858a](https://github.com/Ripwords/MyInvoisClient/commit/648858a))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.1.2

[compare changes](https://github.com/Ripwords/MyInvoisClient/compare/v0.1.1...v0.1.2)

### 🚀 Enhancements

- Introduce RegistrationType type and update registrationType fields in Supplier and Buyer interfaces for improved type safety ([28bcd5b](https://github.com/Ripwords/MyInvoisClient/commit/28bcd5b))
- Consolidate and expand invoice type definitions by merging index.ts into index.d.ts, enhancing type safety and clarity across various invoice-related interfaces ([e8ba3f9](https://github.com/Ripwords/MyInvoisClient/commit/e8ba3f9))

### 💅 Refactors

- Update type exports by removing the deprecated index.d.ts file and directly exporting from documents.d.ts to streamline type definitions and improve clarity ([b5fcd79](https://github.com/Ripwords/MyInvoisClient/commit/b5fcd79))
- Streamline invoice type definitions by removing unused fields and enhancing clarity in the documents.d.ts and document.ts files, while updating tests to reflect these changes ([834bb63](https://github.com/Ripwords/MyInvoisClient/commit/834bb63))

### 🏡 Chore

- Enhance release script to run linting before building and publishing ([230e15c](https://github.com/Ripwords/MyInvoisClient/commit/230e15c))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

## v0.1.1


### 🚀 Enhancements

- First commit ([c03ee2c](https://github.com/Ripwords/MyInvoisClient/commit/c03ee2c))
- Add docs ([cb80529](https://github.com/Ripwords/MyInvoisClient/commit/cb80529))
- Add base64 encoding utility ([51cbad8](https://github.com/Ripwords/MyInvoisClient/commit/51cbad8))
- Add XML-related dependencies and update rolldown config for external modules ([5237aad](https://github.com/Ripwords/MyInvoisClient/commit/5237aad))
- Add support for new XML processing features and enhance rolldown configuration for better module handling ([a492bb8](https://github.com/Ripwords/MyInvoisClient/commit/a492bb8))
- Populate signed properties (step 6) ([87397b1](https://github.com/Ripwords/MyInvoisClient/commit/87397b1))
- Implement new XML processing enhancements and refine rolldown configuration for improved module management ([d1b4455](https://github.com/Ripwords/MyInvoisClient/commit/d1b4455))
- Document signature implementation ([b42604c](https://github.com/Ripwords/MyInvoisClient/commit/b42604c))
- Add debugDocumentHash and testSubmissionHashMethods functions for validating document hash calculations ([b0921ac](https://github.com/Ripwords/MyInvoisClient/commit/b0921ac))
- Expand invoice type definitions with InvoiceSubmission and SignedInvoiceSubmission interfaces, enhance document generation utilities to support new structures, and improve type safety in signature handling ([eae4ed7](https://github.com/Ripwords/MyInvoisClient/commit/eae4ed7))

### 🩹 Fixes

- Update release script in package.json to use bun run for building ([d41b5d3](https://github.com/Ripwords/MyInvoisClient/commit/d41b5d3))
- Update release script in package.json to include public access for npm publish ([36c4e14](https://github.com/Ripwords/MyInvoisClient/commit/36c4e14))

### 💅 Refactors

- Update rolldown.config.ts to support multiple output formats and entry file naming ([eacd967](https://github.com/Ripwords/MyInvoisClient/commit/eacd967))
- Update MyInvoisClient to use taxpayerLogin for token management and remove redundant TokenResponse interface; delete obsolete test file ([4844b2c](https://github.com/Ripwords/MyInvoisClient/commit/4844b2c))
- Simplify UnitTypeCode definition by replacing hardcoded values with imports from unit-specific modules ([62484e3](https://github.com/Ripwords/MyInvoisClient/commit/62484e3))
- Update unit type imports to include .d.ts extensions for better type resolution ([db2ea18](https://github.com/Ripwords/MyInvoisClient/commit/db2ea18))
- Remove taxpayerLogin function and update MyInvoisClient to use platformLogin; add optional onBehalfOf parameter to ClientCredentials ([790ea53](https://github.com/Ripwords/MyInvoisClient/commit/790ea53))
- Enhance PEM certificate handling by adding validation for Base64 content and improving error messages ([9d9d8ae](https://github.com/Ripwords/MyInvoisClient/commit/9d9d8ae))
- Remove unused imports related to Document and Node types from xmldom-ts in signature utility files ([15ae5bb](https://github.com/Ripwords/MyInvoisClient/commit/15ae5bb))
- Remove debug logging from populateFinalDocument function in signature utility ([980b322](https://github.com/Ripwords/MyInvoisClient/commit/980b322))
- Update verifyTin method to support multiple ID types and improve parameter naming for clarity ([3d09585](https://github.com/Ripwords/MyInvoisClient/commit/3d09585))
- Initialize tokenExpiration to undefined and enhance token validation logic in MyInvoisClient ([a7edd3e](https://github.com/Ripwords/MyInvoisClient/commit/a7edd3e))
- Remove unnecessary ts-ignore for private method call in MyInvoisClientWithBRN test ([c04ea76](https://github.com/Ripwords/MyInvoisClient/commit/c04ea76))
- Update MSIC code types and integrate into invoice supplier interface ([f28fa71](https://github.com/Ripwords/MyInvoisClient/commit/f28fa71))
- Enhance hashSignedProperties function to support optional canonicalization algorithm and add fallback for C14N 1.1 ([b7d693b](https://github.com/Ripwords/MyInvoisClient/commit/b7d693b))
- Add registrationType field to Supplier interface in invoice-1_1.d.ts ([225ffeb](https://github.com/Ripwords/MyInvoisClient/commit/225ffeb))
- Enhance canonicalization process in canonicalizeAndHashDocument function with optional algorithm support and fallback for C14N 1.1 ([41a5570](https://github.com/Ripwords/MyInvoisClient/commit/41a5570))
- Restructure invoice1-1.ts for improved readability and maintainability; add XML minification and error handling in document hash generation ([9df51cb](https://github.com/Ripwords/MyInvoisClient/commit/9df51cb))
- Update canonicalization algorithm URIs in signature utilities to use C14N 1.1 and ensure proper fallback handling ([20e375a](https://github.com/Ripwords/MyInvoisClient/commit/20e375a))
- Remove unused MyInvoisClient and invoice1-1 utility files, update tsconfig.json to improve type declaration settings, and enhance invoice-1_1 type definitions with additional fields for better clarity ([2bbe651](https://github.com/Ripwords/MyInvoisClient/commit/2bbe651))

### 🏡 Chore

- Update package.json with new name, version, description, and main entry point ([b952d5a](https://github.com/Ripwords/MyInvoisClient/commit/b952d5a))
- Update package.json to add rolldown and rolldown-plugin-dts as devDependencies ([1322bac](https://github.com/Ripwords/MyInvoisClient/commit/1322bac))
- Add release script to package.json ([7ab378d](https://github.com/Ripwords/MyInvoisClient/commit/7ab378d))
- Bump version to 0.0.2 in package.json ([863187a](https://github.com/Ripwords/MyInvoisClient/commit/863187a))
- Bump version to 0.0.4 in package.json and add dotenv as a devDependency; update rolldown output directory and enable sourcemaps ([a53bc25](https://github.com/Ripwords/MyInvoisClient/commit/a53bc25))
- Bump version to 0.0.5 in package.json; update ofetch import path in MyInvoisClient and tests ([c5ef1d3](https://github.com/Ripwords/MyInvoisClient/commit/c5ef1d3))
- Bump version to 0.0.6 in package.json; remove ofetch dependency and update MyInvoisClient to use fetch; add dotenv setup in vitest.config.ts ([4b73f11](https://github.com/Ripwords/MyInvoisClient/commit/4b73f11))
- Bump version to 0.0.7 in package.json; add exports field and update rolldown output directory; enhance MyInvoisClient with debug option ([7bfa137](https://github.com/Ripwords/MyInvoisClient/commit/7bfa137))
- Organise package.json fields ([94afac0](https://github.com/Ripwords/MyInvoisClient/commit/94afac0))
- Bump version to 0.0.8 in package.json; update rolldown-plugin-dts and typescript dependencies; remove git push from release script ([04fc74c](https://github.com/Ripwords/MyInvoisClient/commit/04fc74c))
- Bump version to 0.0.9 in package.json; add clean script using rimraf; update rolldown config for isolated declaration; fix import path in MyInvoisClient ([f820113](https://github.com/Ripwords/MyInvoisClient/commit/f820113))
- Bump version to 0.0.10 in package.json ([0baa610](https://github.com/Ripwords/MyInvoisClient/commit/0baa610))
- Add @vitest/coverage-v8 dependency to package.json and bun.lock for improved test coverage reporting ([02c11da](https://github.com/Ripwords/MyInvoisClient/commit/02c11da))
- Add *.pem to .gitignore to exclude PEM files from version control ([f86ad14](https://github.com/Ripwords/MyInvoisClient/commit/f86ad14))
- Update dependencies in package.json and bun.lock to include xml-crypto and related packages ([48539ea](https://github.com/Ripwords/MyInvoisClient/commit/48539ea))
- Update package version to 0.0.11, add crypto dependency, and adjust type imports for improved clarity ([1b78281](https://github.com/Ripwords/MyInvoisClient/commit/1b78281))
- Remove rolldown and related dependencies, update build script to use tsdown, and enhance type definitions for better clarity and maintainability ([6c06af9](https://github.com/Ripwords/MyInvoisClient/commit/6c06af9))
- Bump package version to 0.1.0 for release readiness ([8b75664](https://github.com/Ripwords/MyInvoisClient/commit/8b75664))
- Update .gitignore to exclude *.conf files, enhance release script to include changelog generation, and expand README with detailed installation and testing instructions for MyInvois client ([ca968bc](https://github.com/Ripwords/MyInvoisClient/commit/ca968bc))
- Add changelogen dependency for automated changelog generation ([3c6592e](https://github.com/Ripwords/MyInvoisClient/commit/3c6592e))

### ✅ Tests

- Skip MyInvoisClient tests if required environment variables are missing; use hardcoded values for TIN and NRIC in tests ([3200a8e](https://github.com/Ripwords/MyInvoisClient/commit/3200a8e))
- Improve handling of potential canonicalization failures in canonicalizeAndHashDocument test ([16d3f58](https://github.com/Ripwords/MyInvoisClient/commit/16d3f58))

### ❤️ Contributors

- JJ <teohjjteoh@gmail.com>

