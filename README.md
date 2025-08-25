<img src="https://user-images.githubusercontent.com/7339800/129089107-fa190c95-76fd-4a93-8e36-ff4d3ae5681c.png" alt="icon" width="100px" />

# T3 Digital Credential Wallet

T3 Digital Credential Wallet is a cross-platform iOS and Android mobile application 
for storing and sharing digital learner credentials.

Install [T3 Digital Credential Wallet]() for your mobile!

The wallet is based on the [LCW Digital Credential Wallet specification](https://digitalcredentials.mit.edu/docs/Learner-Credential-Wallet-Specification-May-2021.pdf) developed by the [Digital Credentials Consortium](https://digitalcredentials.mit.edu/). The LCW Digital Credential Wallet specification is based on the draft [W3C Universal Wallet interoperability specification](https://w3c-ccg.github.io/universal-wallet-interop-spec/) and the draft [W3C Verifiable Credentials data model](https://w3c.github.io/vc-data-model/).

The app has been compiled for iOS and Android and allows users to add and share credentials, as well as manage the wallet.

## Goals
This T3 Digital Credential Wallet includes the features and technical requirements 
ultimately enabling individuals to curate and present their learning and 
employment records to others — for example, as applicants to educational programs 
or to apply for jobs with employers—in an interoperable manner. 

## Features

## Development Setup

## Installation

**If you encounter any issues, visit the [Troubleshooting Page](https://github.com/digitalcredentials/learner-credential-wallet/wiki/Troubleshooting)**

### Dependencies

Prerequisites:

- [Java](https://www.java.com/en/download/manual.jsp)
- [nvm](https://collabnix.com/how-to-install-and-configure-nvm-on-mac-os/) or [asdf](https://asdf-vm.com/guide/getting-started.html#getting-started)
- [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable) or [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [Node.js](https://nodejs.org/en/)
- [Cocoapods](https://cocoapods.org/) (use brew, not gem, to install)
- [XCode](https://developer.apple.com/xcode/)
- [Android Studio](https://developer.android.com/studio)

See [Installing on Linux](install-linux.md) on setting up the project on Linux.

### Setup of the LCW App

1. Clone this repository or `git pull`
2. In root of project, run `npm install` to install the React Native dependencies.
   - (Optionally, if you use the `asdf` version manager run `asdf install` to install - more info in asdf section below)
3. Run `npm run prebuild:ios` and `npm run prebuild:android` to set up the `ios` and `android` folders. This step uses [Expo prebuild](https://docs.expo.dev/workflow/prebuild/).

#### _If using asdf_

- Run `asdf install` to install the proper versions of the technologies used listed in the `.tool-versions` file
  - If you need to install anything, run `asdf plugin add [plugin-name]` to add it to your local machine
  - Here is a link if you need it to the [asdf installation documentation](https://asdf-vm.com/guide/getting-started.html#getting-started) _(homebrew is the easiest)_

### Running the App

1. Run `yarn start` in one terminal
2. In another terminal run `yarn android`

- When running on android, open Android Studio and make sure the device you want to run on is selected (whether that is an emulator or a real device).
- Note: You might need to hit the play button in Android Studio for it to fully register which device to set to be used from the command line.

3. In another terminal yarn `yarn ios`

## Environment

This project uses **TypeScript and React Native with [Expo](https://docs.expo.dev/)**. It would be best to use an
editor that can hook into the TypeScript language server (VSCode does this with Intellisense, Vim does it with CoC). We use **Prettier** for code formatting with the following configuration:

- `trailingComma: 'none'`
- `semi: false`
- `singleQuote: true`

Most editors support Prettier integration for automatic formatting on save. You can manually format code by running `npm run format` or check formatting with `npm run lint` in the project root.

### Code Formatting Setup

**VS Code:**

1. Install the Prettier extension
2. Enable "Format on Save" in settings
3. Set Prettier as the default formatter

**Other Editors:**
Refer to [Prettier's editor integration guide](https://prettier.io/docs/en/editors.html) for setup instructions.

This project also uses **environment variables**, which are loaded and used in `app.config.js`. These values can be overridden, but development values should not be committed to the repository.

## Project Structure

```
├── app
│   ├── assets ← Image assets
│   ├── components ← React components
│   ├── hooks ← This is where custom hooks are defined (usually wraps lib methods)
│   ├── init ← Logger and registry setup
│   ├── lib ← Location for utility methods
│   ├── mock ← Location for mock data, usually used for testing
│   ├── model ← Database access objects and connections
│   ├── navigation ← React Navigation structure
│   ├── screens ← Individual screen views
│   ├── store ← Redux and Redux Toolkit definitions
│   │   └── slices ← Redux Toolkit slices (add new Redux state here)
│   ├── styles ← All app style definitions
│   └── types ← General place for defining types (usually DCC types for Credential, Presentation, etc...)
├── android ← Auto-generated android build folder, can still be manually edited if needed
└── ios ← Same as android, except it also uses Cocoapods for dependency management
└── patches ← Patches created for software maintenance
└── test ← Where tests are kept, can run `npm run test` and `npm run coverage:open` for coverage stats
```

## Configuration

Overridable configuration is in [`app.config.js`](./app.config.js)

### If forking this project to customize your own version of the LCW, please note the following:

- Setting up your own storage server is **strongly** encouraged. This storage server takes the role of verifying credentials added to the LCW. The `VERIFIER_INSTANCE_URL` can be updated in `app.config.js` as mentioned in the Environment section above.

- The bundle identifier for your customized project will need to be updated in `ios` and `android` directories for Apple and Google app stores, respectively, if deploying to production. The display name in `app.config.js`, as well names under the `expo` section will need to be checked before deploying to app stores.
  - iOS: For iOS, check your target value inside your Podfile
  - Android: For Android, check that the rootProject.name in your `android/settings.gradle` is up-to-date.

### Issuing new credential

Instructions for issuing a credential are [here](https://github.com/digitalcredentials/docs/blob/main/credential/issue_credential.md).

### Adding new credential display

A custom display can be created for different credentials, to do so:

- Create a new React component for your credential type in
  [app/components/CredentialCard/](app/components/CredentialCard/) -
  eg. `app/components/CredentialCard/YourNewTypeCard.tsx`
- Define addition styles in `app/components/CredentialCard/YourNewTypeCard.styles.tsx`
- Add a function to the `credentialTypes` list defined in
  [app/components/CredentialCard/CredentialCard.tsx](app/components/CredentialCard/CredentialCard.tsx).
  The function should return `{component: YourNewCredentialCard, title: 'the title of the credential that should be used when listing it elsewhere'}` or null if the credential isn't the appropriate type for you custom display
- **note**: the list will be scanned for the first function that returns a
  component and title, so it's important that the type check is specific and
  doesn't match any other types.

## Accessibility

The Learner Credential Wallet is designed to be accessible to all users, including those with disabilities. We follow WCAG 2.1 AA guidelines and have conducted comprehensive accessibility testing.

### Enabling Accessibility Features

#### iOS

1. Open **Settings** > **Accessibility**
2. Enable relevant features:
   - **VoiceOver**: Screen reader for blind and low-vision users
   - **Voice Control**: Navigate using voice commands
   - **Switch Control**: Use external switches for navigation
   - **Zoom**: Magnify screen content
   - **Display & Text Size**: Adjust text size, contrast, and reduce motion

#### Android

1. Open **Settings** > **Accessibility**
2. Enable relevant features:
   - **TalkBack**: Screen reader service
   - **Voice Access**: Voice control navigation
   - **Switch Access**: External switch navigation
   - **Magnification**: Screen magnification
   - **High contrast text** and **Large text**: Visual accessibility options

### Accessibility Features in LCW

- **Screen Reader Support**: All UI elements include proper labels and descriptions
- **Keyboard Navigation**: Full app functionality available via external keyboards
- **High Contrast**: Supports system-wide high contrast modes
- **Large Text**: Respects system font size preferences
- **Voice Control**: Compatible with voice navigation systems
- **Reduced Motion**: Honors system preferences for reduced animations

### Testing Accessibility

#### For Developers

**iOS Accessibility Testing:**

1. Run app on iOS simulator
2. Open **Xcode** > **Developer Tools** > **Accessibility Inspector**
3. Select your simulator from the target dropdown
4. Use the inspection tool to verify accessibility labels and roles
5. Run audit to identify accessibility issues

**Android Accessibility Testing:**

1. Run app on Android emulator
2. Open **Android Studio** > **Tools** > **Layout Inspector**
3. Select your running app process
4. Inspect accessibility properties in the Properties panel
5. Enable **TalkBack** in emulator settings to test screen reader functionality

#### Manual Testing

1. **Screen Reader Testing**:
   - iOS: Enable VoiceOver in Settings
   - Android: Enable TalkBack in Settings
   - Navigate through the app using swipe gestures

2. **Keyboard Navigation**:
   - Connect external keyboard
   - Use Tab/Shift+Tab to navigate
   - Ensure all interactive elements are reachable

3. **Visual Testing**:
   - Test with large text sizes (up to 200%)
   - Verify high contrast mode compatibility
   - Check color contrast ratios meet WCAG standards

### Development Guidelines

When contributing to the project, ensure accessibility by:

- Adding `accessibilityLabel` to all interactive elements
- Using `accessibilityHint` for complex interactions
- Setting appropriate `accessibilityRole` values
- Testing with screen readers during development
- Maintaining minimum color contrast ratios (4.5:1 for normal text)

### Accessibility Conformance

We have conducted a Voluntary Product Accessibility Test, please review the
[T3 Digital Credential Wallet Accessibility Conformance Report, December 2021](https://github.com/digitalcredentials/learner-credential-wallet/blob/769bacbc2bfed381a20e2927f2c32a18a6faacbb/docs/Learner%20Credential%20Wallet%20VPAT2.4Rev508-December%202021.pdf)

For more information on accessibility please visit the
[MIT Accessibilty](https://accessibility.mit.edu) page.

# LCW App - general info

## Privacy Policy 
This Privacy Policy explains how T3 Digital Credential Wallet collects, uses, and 
processes personal information about our learners.

### What Personal Information We Collect

We do not collect any personal information.

### Additional Information

We may change this Privacy Policy from time to time. If we make any significant
changes in the way we treat your personal information we will make this clear
on our website or by contacting you directly.

The controller for your personal information is the T3 Digital Credential Wallet 
project at MIT. We can be contacted at lcw-support@mit.edu.

## Terms and Conditions of Use

[T3 Digital Credential Wallet Terms and Conditions of Use]()

## Acknowledgements

Initial development was supported by the U.S. Department of Education (Contract
Number: 91990020C0105). The opinions expressed herein do not necessarily
represent the positions or policies of the U.S. Department of Education, and no
official endorsement by the U.S. Department of Education should be inferred.

Initial development was also supported by the Massachusetts Institute of
Technology. Continued development is supported by members of the Digital
Credentials Consortium.

## License

[MIT License](https://github.com/digitalcredentials/learner-credential-wallet/blob/main/LICENSE) Copyright (c) 2024 Massachusetts Institute of Technology

All files located in external directories are externally maintained libraries
used by this software which have their own licenses; we recommend you read them,
as their terms may differ from the terms above.
