// Skips Android's "lintVital" checks on release builds.
//
// @stripe/stripe-react-native compiles against stripe-android-issuing-push-provisioning, which
// depends on Google's play-services-tapandpay. Google only distributes that library to approved
// card issuers, so lintVital's dependency resolution fails and takes the whole build down.
// Lint only reports warnings; skipping it doesn't change the app.
const { withProjectBuildGradle } = require('expo/config-plugins');

const MARKER = '// lancer: skip lintVital';

module.exports = function withSkipLintVital(config) {
  return withProjectBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes(MARKER)) {
      mod.modResults.contents += `
${MARKER}
subprojects {
  // Lint classpaths only: the app's real compile and runtime dependencies are untouched.
  configurations.configureEach { configuration ->
    if (configuration.name.toLowerCase().contains('lint')) {
      configuration.exclude group: 'com.google.android.gms', module: 'play-services-tapandpay'
    }
  }
  tasks.configureEach { task ->
    if (task.name.startsWith('lintVital')) {
      task.enabled = false
    }
  }
}
`;
    }
    return mod;
  });
};
