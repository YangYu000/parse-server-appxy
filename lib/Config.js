"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Config = void 0;

var _cache = _interopRequireDefault(require("./cache"));

var _SchemaCache = _interopRequireDefault(require("./Controllers/SchemaCache"));

var _DatabaseController = _interopRequireDefault(require("./Controllers/DatabaseController"));

var _net = _interopRequireDefault(require("net"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// A Config object provides information about how a specific app is
// configured.
// mount is the URL for the root of the API; includes http, domain, etc.
function removeTrailingSlash(str) {
  if (!str) {
    return str;
  }

  if (str.endsWith('/')) {
    str = str.substr(0, str.length - 1);
  }

  return str;
}

class Config {
  static get(applicationId, mount) {
    const cacheInfo = _cache.default.get(applicationId);

    if (!cacheInfo) {
      return;
    }

    const config = new Config();
    config.applicationId = applicationId;
    Object.keys(cacheInfo).forEach(key => {
      if (key == 'databaseController') {
        const schemaCache = new _SchemaCache.default(cacheInfo.cacheController, cacheInfo.schemaCacheTTL, cacheInfo.enableSingleSchemaCache);
        config.database = new _DatabaseController.default(cacheInfo.databaseController.adapter, schemaCache);
      } else {
        config[key] = cacheInfo[key];
      }
    });
    config.mount = removeTrailingSlash(mount);
    config.generateSessionExpiresAt = config.generateSessionExpiresAt.bind(config);
    config.generateEmailVerifyTokenExpiresAt = config.generateEmailVerifyTokenExpiresAt.bind(config);
    return config;
  }

  static put(serverConfiguration) {
    Config.validate(serverConfiguration);

    _cache.default.put(serverConfiguration.appId, serverConfiguration);

    Config.setupPasswordValidator(serverConfiguration.passwordPolicy);
    return serverConfiguration;
  }

  static validate({
    verifyUserEmails,
    userController,
    appName,
    publicServerURL,
    revokeSessionOnPasswordReset,
    expireInactiveSessions,
    sessionLength,
    maxLimit,
    emailVerifyTokenValidityDuration,
    accountLockout,
    passwordPolicy,
    masterKeyIps,
    masterKey,
    readOnlyMasterKey
  }) {
    if (masterKey === readOnlyMasterKey) {
      throw new Error('masterKey and readOnlyMasterKey should be different');
    }

    const emailAdapter = userController.adapter;

    if (verifyUserEmails) {
      this.validateEmailConfiguration({
        emailAdapter,
        appName,
        publicServerURL,
        emailVerifyTokenValidityDuration
      });
    }

    this.validateAccountLockoutPolicy(accountLockout);
    this.validatePasswordPolicy(passwordPolicy);

    if (typeof revokeSessionOnPasswordReset !== 'boolean') {
      throw 'revokeSessionOnPasswordReset must be a boolean value';
    }

    if (publicServerURL) {
      if (!publicServerURL.startsWith('http://') && !publicServerURL.startsWith('https://')) {
        throw 'publicServerURL should be a valid HTTPS URL starting with https://';
      }
    }

    this.validateSessionConfiguration(sessionLength, expireInactiveSessions);
    this.validateMasterKeyIps(masterKeyIps);
    this.validateMaxLimit(maxLimit);
  }

  static validateAccountLockoutPolicy(accountLockout) {
    if (accountLockout) {
      if (typeof accountLockout.duration !== 'number' || accountLockout.duration <= 0 || accountLockout.duration > 99999) {
        throw 'Account lockout duration should be greater than 0 and less than 100000';
      }

      if (!Number.isInteger(accountLockout.threshold) || accountLockout.threshold < 1 || accountLockout.threshold > 999) {
        throw 'Account lockout threshold should be an integer greater than 0 and less than 1000';
      }
    }
  }

  static validatePasswordPolicy(passwordPolicy) {
    if (passwordPolicy) {
      if (passwordPolicy.maxPasswordAge !== undefined && (typeof passwordPolicy.maxPasswordAge !== 'number' || passwordPolicy.maxPasswordAge < 0)) {
        throw 'passwordPolicy.maxPasswordAge must be a positive number';
      }

      if (passwordPolicy.resetTokenValidityDuration !== undefined && (typeof passwordPolicy.resetTokenValidityDuration !== 'number' || passwordPolicy.resetTokenValidityDuration <= 0)) {
        throw 'passwordPolicy.resetTokenValidityDuration must be a positive number';
      }

      if (passwordPolicy.validatorPattern) {
        if (typeof passwordPolicy.validatorPattern === 'string') {
          passwordPolicy.validatorPattern = new RegExp(passwordPolicy.validatorPattern);
        } else if (!(passwordPolicy.validatorPattern instanceof RegExp)) {
          throw 'passwordPolicy.validatorPattern must be a regex string or RegExp object.';
        }
      }

      if (passwordPolicy.validatorCallback && typeof passwordPolicy.validatorCallback !== 'function') {
        throw 'passwordPolicy.validatorCallback must be a function.';
      }

      if (passwordPolicy.doNotAllowUsername && typeof passwordPolicy.doNotAllowUsername !== 'boolean') {
        throw 'passwordPolicy.doNotAllowUsername must be a boolean value.';
      }

      if (passwordPolicy.maxPasswordHistory && (!Number.isInteger(passwordPolicy.maxPasswordHistory) || passwordPolicy.maxPasswordHistory <= 0 || passwordPolicy.maxPasswordHistory > 20)) {
        throw 'passwordPolicy.maxPasswordHistory must be an integer ranging 0 - 20';
      }
    }
  } // if the passwordPolicy.validatorPattern is configured then setup a callback to process the pattern


  static setupPasswordValidator(passwordPolicy) {
    if (passwordPolicy && passwordPolicy.validatorPattern) {
      passwordPolicy.patternValidator = value => {
        return passwordPolicy.validatorPattern.test(value);
      };
    }
  }

  static validateEmailConfiguration({
    emailAdapter,
    appName,
    publicServerURL,
    emailVerifyTokenValidityDuration
  }) {
    if (!emailAdapter) {
      throw 'An emailAdapter is required for e-mail verification and password resets.';
    }

    if (typeof appName !== 'string') {
      throw 'An app name is required for e-mail verification and password resets.';
    }

    if (typeof publicServerURL !== 'string') {
      throw 'A public server url is required for e-mail verification and password resets.';
    }

    if (emailVerifyTokenValidityDuration) {
      if (isNaN(emailVerifyTokenValidityDuration)) {
        throw 'Email verify token validity duration must be a valid number.';
      } else if (emailVerifyTokenValidityDuration <= 0) {
        throw 'Email verify token validity duration must be a value greater than 0.';
      }
    }
  }

  static validateMasterKeyIps(masterKeyIps) {
    for (const ip of masterKeyIps) {
      if (!_net.default.isIP(ip)) {
        throw `Invalid ip in masterKeyIps: ${ip}`;
      }
    }
  }

  get mount() {
    var mount = this._mount;

    if (this.publicServerURL) {
      mount = this.publicServerURL;
    }

    return mount;
  }

  set mount(newValue) {
    this._mount = newValue;
  }

  static validateSessionConfiguration(sessionLength, expireInactiveSessions) {
    if (expireInactiveSessions) {
      if (isNaN(sessionLength)) {
        throw 'Session length must be a valid number.';
      } else if (sessionLength <= 0) {
        throw 'Session length must be a value greater than 0.';
      }
    }
  }

  static validateMaxLimit(maxLimit) {
    if (maxLimit <= 0) {
      throw 'Max limit must be a value greater than 0.';
    }
  }

  generateEmailVerifyTokenExpiresAt() {
    if (!this.verifyUserEmails || !this.emailVerifyTokenValidityDuration) {
      return undefined;
    }

    var now = new Date();
    return new Date(now.getTime() + this.emailVerifyTokenValidityDuration * 1000);
  }

  generatePasswordResetTokenExpiresAt() {
    if (!this.passwordPolicy || !this.passwordPolicy.resetTokenValidityDuration) {
      return undefined;
    }

    const now = new Date();
    return new Date(now.getTime() + this.passwordPolicy.resetTokenValidityDuration * 1000);
  }

  generateSessionExpiresAt() {
    if (!this.expireInactiveSessions) {
      return undefined;
    }

    var now = new Date();
    return new Date(now.getTime() + this.sessionLength * 1000);
  }

  get invalidLinkURL() {
    return this.customPages.invalidLink || `${this.publicServerURL}/apps/invalid_link.html`;
  }

  get invalidVerificationLinkURL() {
    return this.customPages.invalidVerificationLink || `${this.publicServerURL}/apps/invalid_verification_link.html`;
  }

  get linkSendSuccessURL() {
    return this.customPages.linkSendSuccess || `${this.publicServerURL}/apps/link_send_success.html`;
  }

  get linkSendFailURL() {
    return this.customPages.linkSendFail || `${this.publicServerURL}/apps/link_send_fail.html`;
  }

  get verifyEmailSuccessURL() {
    return this.customPages.verifyEmailSuccess || `${this.publicServerURL}/apps/verify_email_success.html`;
  }

  get choosePasswordURL() {
    return this.customPages.choosePassword || `${this.publicServerURL}/apps/choose_password`;
  }

  get requestResetPasswordURL() {
    return `${this.publicServerURL}/apps/${this.applicationId}/request_password_reset`;
  }

  get passwordResetSuccessURL() {
    return this.customPages.passwordResetSuccess || `${this.publicServerURL}/apps/password_reset_success.html`;
  }

  get parseFrameURL() {
    return this.customPages.parseFrameURL;
  }

  get verifyEmailURL() {
    return `${this.publicServerURL}/apps/${this.applicationId}/verify_email`;
  }

}

exports.Config = Config;
var _default = Config;
exports.default = _default;
module.exports = Config;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9Db25maWcuanMiXSwibmFtZXMiOlsicmVtb3ZlVHJhaWxpbmdTbGFzaCIsInN0ciIsImVuZHNXaXRoIiwic3Vic3RyIiwibGVuZ3RoIiwiQ29uZmlnIiwiZ2V0IiwiYXBwbGljYXRpb25JZCIsIm1vdW50IiwiY2FjaGVJbmZvIiwiQXBwQ2FjaGUiLCJjb25maWciLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsInNjaGVtYUNhY2hlIiwiU2NoZW1hQ2FjaGUiLCJjYWNoZUNvbnRyb2xsZXIiLCJzY2hlbWFDYWNoZVRUTCIsImVuYWJsZVNpbmdsZVNjaGVtYUNhY2hlIiwiZGF0YWJhc2UiLCJEYXRhYmFzZUNvbnRyb2xsZXIiLCJkYXRhYmFzZUNvbnRyb2xsZXIiLCJhZGFwdGVyIiwiZ2VuZXJhdGVTZXNzaW9uRXhwaXJlc0F0IiwiYmluZCIsImdlbmVyYXRlRW1haWxWZXJpZnlUb2tlbkV4cGlyZXNBdCIsInB1dCIsInNlcnZlckNvbmZpZ3VyYXRpb24iLCJ2YWxpZGF0ZSIsImFwcElkIiwic2V0dXBQYXNzd29yZFZhbGlkYXRvciIsInBhc3N3b3JkUG9saWN5IiwidmVyaWZ5VXNlckVtYWlscyIsInVzZXJDb250cm9sbGVyIiwiYXBwTmFtZSIsInB1YmxpY1NlcnZlclVSTCIsInJldm9rZVNlc3Npb25PblBhc3N3b3JkUmVzZXQiLCJleHBpcmVJbmFjdGl2ZVNlc3Npb25zIiwic2Vzc2lvbkxlbmd0aCIsIm1heExpbWl0IiwiZW1haWxWZXJpZnlUb2tlblZhbGlkaXR5RHVyYXRpb24iLCJhY2NvdW50TG9ja291dCIsIm1hc3RlcktleUlwcyIsIm1hc3RlcktleSIsInJlYWRPbmx5TWFzdGVyS2V5IiwiRXJyb3IiLCJlbWFpbEFkYXB0ZXIiLCJ2YWxpZGF0ZUVtYWlsQ29uZmlndXJhdGlvbiIsInZhbGlkYXRlQWNjb3VudExvY2tvdXRQb2xpY3kiLCJ2YWxpZGF0ZVBhc3N3b3JkUG9saWN5Iiwic3RhcnRzV2l0aCIsInZhbGlkYXRlU2Vzc2lvbkNvbmZpZ3VyYXRpb24iLCJ2YWxpZGF0ZU1hc3RlcktleUlwcyIsInZhbGlkYXRlTWF4TGltaXQiLCJkdXJhdGlvbiIsIk51bWJlciIsImlzSW50ZWdlciIsInRocmVzaG9sZCIsIm1heFBhc3N3b3JkQWdlIiwidW5kZWZpbmVkIiwicmVzZXRUb2tlblZhbGlkaXR5RHVyYXRpb24iLCJ2YWxpZGF0b3JQYXR0ZXJuIiwiUmVnRXhwIiwidmFsaWRhdG9yQ2FsbGJhY2siLCJkb05vdEFsbG93VXNlcm5hbWUiLCJtYXhQYXNzd29yZEhpc3RvcnkiLCJwYXR0ZXJuVmFsaWRhdG9yIiwidmFsdWUiLCJ0ZXN0IiwiaXNOYU4iLCJpcCIsIm5ldCIsImlzSVAiLCJfbW91bnQiLCJuZXdWYWx1ZSIsIm5vdyIsIkRhdGUiLCJnZXRUaW1lIiwiZ2VuZXJhdGVQYXNzd29yZFJlc2V0VG9rZW5FeHBpcmVzQXQiLCJpbnZhbGlkTGlua1VSTCIsImN1c3RvbVBhZ2VzIiwiaW52YWxpZExpbmsiLCJpbnZhbGlkVmVyaWZpY2F0aW9uTGlua1VSTCIsImludmFsaWRWZXJpZmljYXRpb25MaW5rIiwibGlua1NlbmRTdWNjZXNzVVJMIiwibGlua1NlbmRTdWNjZXNzIiwibGlua1NlbmRGYWlsVVJMIiwibGlua1NlbmRGYWlsIiwidmVyaWZ5RW1haWxTdWNjZXNzVVJMIiwidmVyaWZ5RW1haWxTdWNjZXNzIiwiY2hvb3NlUGFzc3dvcmRVUkwiLCJjaG9vc2VQYXNzd29yZCIsInJlcXVlc3RSZXNldFBhc3N3b3JkVVJMIiwicGFzc3dvcmRSZXNldFN1Y2Nlc3NVUkwiLCJwYXNzd29yZFJlc2V0U3VjY2VzcyIsInBhcnNlRnJhbWVVUkwiLCJ2ZXJpZnlFbWFpbFVSTCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFJQTs7QUFDQTs7QUFDQTs7QUFDQTs7OztBQVBBO0FBQ0E7QUFDQTtBQU9BLFNBQVNBLG1CQUFULENBQTZCQyxHQUE3QixFQUFrQztBQUNoQyxNQUFJLENBQUNBLEdBQUwsRUFB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USxHQUFFLEtBQUt6RCxlQUFnQixTQUM3QixLQUFLOUIsYUFDTix5QkFGRDtBQUdEOztBQUVELE1BQUl3Rix1QkFBSixHQUE4QjtBQUM1QixXQUNFLEtBQUtiLFdBQUwsQ0FBaUJjLG9CQUFqQixJQUNDLEdBQUUsS0FBSzNELGVBQWdCLG1DQUYxQjtBQUlEOztBQUVELE1BQUk0RCxhQUFKLEdBQW9CO0FBQ2xCLFdBQU8sS0FBS2YsV0FBTCxDQUFpQmUsYUFBeEI7QUFDRDs7QUFFRCxNQUFJQyxjQUFKLEdBQXFCO0FBQ25CLFdBQVEsR0FBRSxLQUFLN0QsZUFBZ0IsU0FBUSxLQUFLOUIsYUFBYyxlQUExRDtBQUNEOztBQXhVaUI7OztlQTJVTEYsTTs7QUFDZjhGLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQi9GLE1BQWpCIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQSBDb25maWcgb2JqZWN0IHByb3ZpZGVzIGluZm9ybWF0aW9uIGFib3V0IGhvdyBhIHNwZWNpZmljIGFwcCBpc1xuLy8gY29uZmlndXJlZC5cbi8vIG1vdW50IGlzIHRoZSBVUkwgZm9yIHRoZSByb290IG9mIHRoZSBBUEk7IGluY2x1ZGVzIGh0dHAsIGRvbWFpbiwgZXRjLlxuXG5pbXBvcnQgQXBwQ2FjaGUgZnJvbSAnLi9jYWNoZSc7XG5pbXBvcnQgU2NoZW1hQ2FjaGUgZnJvbSAnLi9Db250cm9sbGVycy9TY2hlbWFDYWNoZSc7XG5pbXBvcnQgRGF0YWJhc2VDb250cm9sbGVyIGZyb20gJy4vQ29udHJvbGxlcnMvRGF0YWJhc2VDb250cm9sbGVyJztcbmltcG9ydCBuZXQgZnJvbSAnbmV0JztcblxuZnVuY3Rpb24gcmVtb3ZlVHJhaWxpbmdTbGFzaChzdHIpIHtcbiAgaWYgKCFzdHIpIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG4gIGlmIChzdHIuZW5kc1dpdGgoJy8nKSkge1xuICAgIHN0ciA9IHN0ci5zdWJzdHIoMCwgc3RyLmxlbmd0aCAtIDEpO1xuICB9XG4gIHJldHVybiBzdHI7XG59XG5cbmV4cG9ydCBjbGFzcyBDb25maWcge1xuICBzdGF0aWMgZ2V0KGFwcGxpY2F0aW9uSWQ6IHN0cmluZywgbW91bnQ6IHN0cmluZykge1xuICAgIGNvbnN0IGNhY2hlSW5mbyA9IEFwcENhY2hlLmdldChhcHBsaWNhdGlvbklkKTtcbiAgICBpZiAoIWNhY2hlSW5mbykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBjb25maWcgPSBuZXcgQ29uZmlnKCk7XG4gICAgY29uZmlnLmFwcGxpY2F0aW9uSWQgPSBhcHBsaWNhdGlvbklkO1xuICAgIE9iamVjdC5rZXlzKGNhY2hlSW5mbykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgaWYgKGtleSA9PSAnZGF0YWJhc2VDb250cm9sbGVyJykge1xuICAgICAgICBjb25zdCBzY2hlbWFDYWNoZSA9IG5ldyBTY2hlbWFDYWNoZShcbiAgICAgICAgICBjYWNoZUluZm8uY2FjaGVDb250cm9sbGVyLFxuICAgICAgICAgIGNhY2hlSW5mby5zY2hlbWFDYWNoZVRUTCxcbiAgICAgICAgICBjYWNoZUluZm8uZW5hYmxlU2luZ2xlU2NoZW1hQ2FjaGVcbiAgICAgICAgKTtcbiAgICAgICAgY29uZmlnLmRhdGFiYXNlID0gbmV3IERhdGFiYXNlQ29udHJvbGxlcihcbiAgICAgICAgICBjYWNoZUluZm8uZGF0YWJhc2VDb250cm9sbGVyLmFkYXB0ZXIsXG4gICAgICAgICAgc2NoZW1hQ2FjaGVcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbmZpZ1trZXldID0gY2FjaGVJbmZvW2tleV07XG4gICAgICB9XG4gICAgfSk7XG4gICAgY29uZmlnLm1vdW50ID0gcmVtb3ZlVHJhaWxpbmdTbGFzaChtb3VudCk7XG4gICAgY29uZmlnLmdlbmVyYXRlU2Vzc2lvbkV4cGlyZXNBdCA9IGNvbmZpZy5nZW5lcmF0ZVNlc3Npb25FeHBpcmVzQXQuYmluZChcbiAgICAgIGNvbmZpZ1xuICAgICk7XG4gICAgY29uZmlnLmdlbmVyYXRlRW1haWxWZXJpZnlUb2tlbkV4cGlyZXNBdCA9IGNvbmZpZy5nZW5lcmF0ZUVtYWlsVmVyaWZ5VG9rZW5FeHBpcmVzQXQuYmluZChcbiAgICAgIGNvbmZpZ1xuICAgICk7XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfVxuXG4gIHN0YXRpYyBwdXQoc2VydmVyQ29uZmlndXJhdGlvbikge1xuICAgIENvbmZpZy52YWxpZGF0ZShzZXJ2ZXJDb25maWd1cmF0aW9uKTtcbiAgICBBcHBDYWNoZS5wdXQoc2VydmVyQ29uZmlndXJhdGlvbi5hcHBJZCwgc2VydmVyQ29uZmlndXJhdGlvbik7XG4gICAgQ29uZmlnLnNldHVwUGFzc3dvcmRWYWxpZGF0b3Ioc2VydmVyQ29uZmlndXJhdGlvbi5wYXNzd29yZFBvbGljeSk7XG4gICAgcmV0dXJuIHNlcnZlckNvbmZpZ3VyYXRpb247XG4gIH1cblxuICBzdGF0aWMgdmFsaWRhdGUoe1xuICAgIHZlcmlmeVVzZXJFbWFpbHMsXG4gICAgdXNlckNvbnRyb2xsZXIsXG4gICAgYXBwTmFtZSxcbiAgICBwdWJsaWNTZXJ2ZXJVUkwsXG4gICAgcmV2b2tlU2Vzc2lvbk9uUGFzc3dvcmRSZXNldCxcbiAgICBleHBpcmVJbmFjdGl2ZVNlc3Npb25zLFxuICAgIHNlc3Npb25MZW5ndGgsXG4gICAgbWF4TGltaXQsXG4gICAgZW1haWxWZXJpZnlUb2tlblZhbGlkaXR5RHVyYXRpb24sXG4gICAgYWNjb3VudExvY2tvdXQsXG4gICAgcGFzc3dvcmRQb2xpY3ksXG4gICAgbWFzdGVyS2V5SXBzLFxuICAgIG1hc3RlcktleSxcbiAgICByZWFkT25seU1hc3RlcktleSxcbiAgfSkge1xuICAgIGlmIChtYXN0ZXJLZXkgPT09IHJlYWRPbmx5TWFzdGVyS2V5KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ21hc3RlcktleSBhbmQgcmVhZE9ubHlNYXN0ZXJLZXkgc2hvdWxkIGJlIGRpZmZlcmVudCcpO1xuICAgIH1cblxuICAgIGNvbnN0IGVtYWlsQWRhcHRlciA9IHVzZXJDb250cm9sbGVyLmFkYXB0ZXI7XG4gICAgaWYgKHZlcmlmeVVzZXJFbWFpbHMpIHtcbiAgICAgIHRoaXMudmFsaWRhdGVFbWFpbENvbmZpZ3VyYXRpb24oe1xuICAgICAgICBlbWFpbEFkYXB0ZXIsXG4gICAgICAgIGFwcE5hbWUsXG4gICAgICAgIHB1YmxpY1NlcnZlclVSTCxcbiAgICAgICAgZW1haWxWZXJpZnlUb2tlblZhbGlkaXR5RHVyYXRpb24sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLnZhbGlkYXRlQWNjb3VudExvY2tvdXRQb2xpY3koYWNjb3VudExvY2tvdXQpO1xuXG4gICAgdGhpcy52YWxpZGF0ZVBhc3N3b3JkUG9saWN5KHBhc3N3b3JkUG9saWN5KTtcblxuICAgIGlmICh0eXBlb2YgcmV2b2tlU2Vzc2lvbk9uUGFzc3dvcmRSZXNldCAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICB0aHJvdyAncmV2b2tlU2Vzc2lvbk9uUGFzc3dvcmRSZXNldCBtdXN0IGJlIGEgYm9vbGVhbiB2YWx1ZSc7XG4gICAgfVxuXG4gICAgaWYgKHB1YmxpY1NlcnZlclVSTCkge1xuICAgICAgaWYgKFxuICAgICAgICAhcHVibGljU2VydmVyVVJMLnN0YXJ0c1dpdGgoJ2h0dHA6Ly8nKSAmJlxuICAgICAgICAhcHVibGljU2VydmVyVVJMLnN0YXJ0c1dpdGgoJ2h0dHBzOi8vJylcbiAgICAgICkge1xuICAgICAgICB0aHJvdyAncHVibGljU2VydmVyVVJMIHNob3VsZCBiZSBhIHZhbGlkIEhUVFBTIFVSTCBzdGFydGluZyB3aXRoIGh0dHBzOi8vJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnZhbGlkYXRlU2Vzc2lvbkNvbmZpZ3VyYXRpb24oc2Vzc2lvbkxlbmd0aCwgZXhwaXJlSW5hY3RpdmVTZXNzaW9ucyk7XG5cbiAgICB0aGlzLnZhbGlkYXRlTWFzdGVyS2V5SXBzKG1hc3RlcktleUlwcyk7XG5cbiAgICB0aGlzLnZhbGlkYXRlTWF4TGltaXQobWF4TGltaXQpO1xuICB9XG5cbiAgc3RhdGljIHZhbGlkYXRlQWNjb3VudExvY2tvdXRQb2xpY3koYWNjb3VudExvY2tvdXQpIHtcbiAgICBpZiAoYWNjb3VudExvY2tvdXQpIHtcbiAgICAgIGlmIChcbiAgICAgICAgdHlwZW9mIGFjY291bnRMb2Nrb3V0LmR1cmF0aW9uICE9PSAnbnVtYmVyJyB8fFxuICAgICAgICBhY2NvdW50TG9ja291dC5kdXJhdGlvbiA8PSAwIHx8XG4gICAgICAgIGFjY291bnRMb2Nrb3V0LmR1cmF0aW9uID4gOTk5OTlcbiAgICAgICkge1xuICAgICAgICB0aHJvdyAnQWNjb3VudCBsb2Nrb3V0IGR1cmF0aW9uIHNob3VsZCBiZSBncmVhdGVyIHRoYW4gMCBhbmQgbGVzcyB0aGFuIDEwMDAwMCc7XG4gICAgICB9XG5cbiAgICAgIGlmIChcbiAgICAgICAgIU51bWJlci5pc0ludGVnZXIoYWNjb3VudExvY2tvdXQudGhyZXNob2xkKSB8fFxuICAgICAgICBhY2NvdW50TG9ja291dC50aHJlc2hvbGQgPCAxIHx8XG4gICAgICAgIGFjY291bnRMb2Nrb3V0LnRocmVzaG9sZCA+IDk5OVxuICAgICAgKSB7XG4gICAgICAgIHRocm93ICdBY2NvdW50IGxvY2tvdXQgdGhyZXNob2xkIHNob3VsZCBiZSBhbiBpbnRlZ2VyIGdyZWF0ZXIgdGhhbiAwIGFuZCBsZXNzIHRoYW4gMTAwMCc7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIHZhbGlkYXRlUGFzc3dvcmRQb2xpY3kocGFzc3dvcmRQb2xpY3kpIHtcbiAgICBpZiAocGFzc3dvcmRQb2xpY3kpIHtcbiAgICAgIGlmIChcbiAgICAgICAgcGFzc3dvcmRQb2xpY3kubWF4UGFzc3dvcmRBZ2UgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAodHlwZW9mIHBhc3N3b3JkUG9saWN5Lm1heFBhc3N3b3JkQWdlICE9PSAnbnVtYmVyJyB8fFxuICAgICAgICAgIHBhc3N3b3JkUG9saWN5Lm1heFBhc3N3b3JkQWdlIDwgMClcbiAgICAgICkge1xuICAgICAgICB0aHJvdyAncGFzc3dvcmRQb2xpY3kubWF4UGFzc3dvcmRBZ2UgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcic7XG4gICAgICB9XG5cbiAgICAgIGlmIChcbiAgICAgICAgcGFzc3dvcmRQb2xpY3kucmVzZXRUb2tlblZhbGlkaXR5RHVyYXRpb24gIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAodHlwZW9mIHBhc3N3b3JkUG9saWN5LnJlc2V0VG9rZW5WYWxpZGl0eUR1cmF0aW9uICE9PSAnbnVtYmVyJyB8fFxuICAgICAgICAgIHBhc3N3b3JkUG9saWN5LnJlc2V0VG9rZW5WYWxpZGl0eUR1cmF0aW9uIDw9IDApXG4gICAgICApIHtcbiAgICAgICAgdGhyb3cgJ3Bhc3N3b3JkUG9saWN5LnJlc2V0VG9rZW5WYWxpZGl0eUR1cmF0aW9uIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFzc3dvcmRQb2xpY3kudmFsaWRhdG9yUGF0dGVybikge1xuICAgICAgICBpZiAodHlwZW9mIHBhc3N3b3JkUG9saWN5LnZhbGlkYXRvclBhdHRlcm4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcGFzc3dvcmRQb2xpY3kudmFsaWRhdG9yUGF0dGVybiA9IG5ldyBSZWdFeHAoXG4gICAgICAgICAgICBwYXNzd29yZFBvbGljeS52YWxpZGF0b3JQYXR0ZXJuXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmICghKHBhc3N3b3JkUG9saWN5LnZhbGlkYXRvclBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApKSB7XG4gICAgICAgICAgdGhyb3cgJ3Bhc3N3b3JkUG9saWN5LnZhbGlkYXRvclBhdHRlcm4gbXVzdCBiZSBhIHJlZ2V4IHN0cmluZyBvciBSZWdFeHAgb2JqZWN0Lic7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKFxuICAgICAgICBwYXNzd29yZFBvbGljeS52YWxpZGF0b3JDYWxsYmFjayAmJlxuICAgICAgICB0eXBlb2YgcGFzc3dvcmRQb2xpY3kudmFsaWRhdG9yQ2FsbGJhY2sgIT09ICdmdW5jdGlvbidcbiAgICAgICkge1xuICAgICAgICB0aHJvdyAncGFzc3dvcmRQb2xpY3kudmFsaWRhdG9yQ2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uLic7XG4gICAgICB9XG5cbiAgICAgIGlmIChcbiAgICAgICAgcGFzc3dvcmRQb2xpY3kuZG9Ob3RBbGxvd1VzZXJuYW1lICYmXG4gICAgICAgIHR5cGVvZiBwYXNzd29yZFBvbGljeS5kb05vdEFsbG93VXNlcm5hbWUgIT09ICdib29sZWFuJ1xuICAgICAgKSB7XG4gICAgICAgIHRocm93ICdwYXNzd29yZFBvbGljeS5kb05vdEFsbG93VXNlcm5hbWUgbXVzdCBiZSBhIGJvb2xlYW4gdmFsdWUuJztcbiAgICAgIH1cblxuICAgICAgaWYgKFxuICAgICAgICBwYXNzd29yZFBvbGljeS5tYXhQYXNzd29yZEhpc3RvcnkgJiZcbiAgICAgICAgKCFOdW1iZXIuaXNJbnRlZ2VyKHBhc3N3b3JkUG9saWN5Lm1heFBhc3N3b3JkSGlzdG9yeSkgfHxcbiAgICAgICAgICBwYXNzd29yZFBvbGljeS5tYXhQYXNzd29yZEhpc3RvcnkgPD0gMCB8fFxuICAgICAgICAgIHBhc3N3b3JkUG9saWN5Lm1heFBhc3N3b3JkSGlzdG9yeSA+IDIwKVxuICAgICAgKSB7XG4gICAgICAgIHRocm93ICdwYXNzd29yZFBvbGljeS5tYXhQYXNzd29yZEhpc3RvcnkgbXVzdCBiZSBhbiBpbnRlZ2VyIHJhbmdpbmcgMCAtIDIwJztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGFzc3dvcmRQb2xpY3kudmFsaWRhdG9yUGF0dGVybiBpcyBjb25maWd1cmVkIHRoZW4gc2V0dXAgYSBjYWxsYmFjayB0byBwcm9jZXNzIHRoZSBwYXR0ZXJuXG4gIHN0YXRpYyBzZXR1cFBhc3N3b3JkVmFsaWRhdG9yKHBhc3N3b3JkUG9saWN5KSB7XG4gICAgaWYgKHBhc3N3b3JkUG9saWN5ICYmIHBhc3N3b3JkUG9saWN5LnZhbGlkYXRvclBhdHRlcm4pIHtcbiAgICAgIHBhc3N3b3JkUG9saWN5LnBhdHRlcm5WYWxpZGF0b3IgPSB2YWx1ZSA9PiB7XG4gICAgICAgIHJldHVybiBwYXNzd29yZFBvbGljeS52YWxpZGF0b3JQYXR0ZXJuLnRlc3QodmFsdWUpO1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgdmFsaWRhdGVFbWFpbENvbmZpZ3VyYXRpb24oe1xuICAgIGVtYWlsQWRhcHRlcixcbiAgICBhcHBOYW1lLFxuICAgIHB1YmxpY1NlcnZlclVSTCxcbiAgICBlbWFpbFZlcmlmeVRva2VuVmFsaWRpdHlEdXJhdGlvbixcbiAgfSkge1xuICAgIGlmICghZW1haWxBZGFwdGVyKSB7XG4gICAgICB0aHJvdyAnQW4gZW1haWxBZGFwdGVyIGlzIHJlcXVpcmVkIGZvciBlLW1haWwgdmVyaWZpY2F0aW9uIGFuZCBwYXNzd29yZCByZXNldHMuJztcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBhcHBOYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgJ0FuIGFwcCBuYW1lIGlzIHJlcXVpcmVkIGZvciBlLW1haWwgdmVyaWZpY2F0aW9uIGFuZCBwYXNzd29yZCByZXNldHMuJztcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBwdWJsaWNTZXJ2ZXJVUkwgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyAnQSBwdWJsaWMgc2VydmVyIHVybCBpcyByZXF1aXJlZCBmb3IgZS1tYWlsIHZlcmlmaWNhdGlvbiBhbmQgcGFzc3dvcmQgcmVzZXRzLic7XG4gICAgfVxuICAgIGlmIChlbWFpbFZlcmlmeVRva2VuVmFsaWRpdHlEdXJhdGlvbikge1xuICAgICAgaWYgKGlzTmFOKGVtYWlsVmVyaWZ5VG9rZW5WYWxpZGl0eUR1cmF0aW9uKSkge1xuICAgICAgICB0aHJvdyAnRW1haWwgdmVyaWZ5IHRva2VuIHZhbGlkaXR5IGR1cmF0aW9uIG11c3QgYmUgYSB2YWxpZCBudW1iZXIuJztcbiAgICAgIH0gZWxzZSBpZiAoZW1haWxWZXJpZnlUb2tlblZhbGlkaXR5RHVyYXRpb24gPD0gMCkge1xuICAgICAgICB0aHJvdyAnRW1haWwgdmVyaWZ5IHRva2VuIHZhbGlkaXR5IGR1cmF0aW9uIG11c3QgYmUgYSB2YWx1ZSBncmVhdGVyIHRoYW4gMC4nO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyB2YWxpZGF0ZU1hc3RlcktleUlwcyhtYXN0ZXJLZXlJcHMpIHtcbiAgICBmb3IgKGNvbnN0IGlwIG9mIG1hc3RlcktleUlwcykge1xuICAgICAgaWYgKCFuZXQuaXNJUChpcCkpIHtcbiAgICAgICAgdGhyb3cgYEludmFsaWQgaXAgaW4gbWFzdGVyS2V5SXBzOiAke2lwfWA7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0IG1vdW50KCkge1xuICAgIHZhciBtb3VudCA9IHRoaXMuX21vdW50O1xuICAgIGlmICh0aGlzLnB1YmxpY1NlcnZlclVSTCkge1xuICAgICAgbW91bnQgPSB0aGlzLnB1YmxpY1NlcnZlclVSTDtcbiAgICB9XG4gICAgcmV0dXJuIG1vdW50O1xuICB9XG5cbiAgc2V0IG1vdW50KG5ld1ZhbHVlKSB7XG4gICAgdGhpcy5fbW91bnQgPSBuZXdWYWx1ZTtcbiAgfVxuXG4gIHN0YXRpYyB2YWxpZGF0ZVNlc3Npb25Db25maWd1cmF0aW9uKHNlc3Npb25MZW5ndGgsIGV4cGlyZUluYWN0aXZlU2Vzc2lvbnMpIHtcbiAgICBpZiAoZXhwaXJlSW5hY3RpdmVTZXNzaW9ucykge1xuICAgICAgaWYgKGlzTmFOKHNlc3Npb25MZW5ndGgpKSB7XG4gICAgICAgIHRocm93ICdTZXNzaW9uIGxlbmd0aCBtdXN0IGJlIGEgdmFsaWQgbnVtYmVyLic7XG4gICAgICB9IGVsc2UgaWYgKHNlc3Npb25MZW5ndGggPD0gMCkge1xuICAgICAgICB0aHJvdyAnU2Vzc2lvbiBsZW5ndGggbXVzdCBiZSBhIHZhbHVlIGdyZWF0ZXIgdGhhbiAwLic7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIHZhbGlkYXRlTWF4TGltaXQobWF4TGltaXQpIHtcbiAgICBpZiAobWF4TGltaXQgPD0gMCkge1xuICAgICAgdGhyb3cgJ01heCBsaW1pdCBtdXN0IGJlIGEgdmFsdWUgZ3JlYXRlciB0aGFuIDAuJztcbiAgICB9XG4gIH1cblxuICBnZW5lcmF0ZUVtYWlsVmVyaWZ5VG9rZW5FeHBpcmVzQXQoKSB7XG4gICAgaWYgKCF0aGlzLnZlcmlmeVVzZXJFbWFpbHMgfHwgIXRoaXMuZW1haWxWZXJpZnlUb2tlblZhbGlkaXR5RHVyYXRpb24pIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuICAgIHJldHVybiBuZXcgRGF0ZShcbiAgICAgIG5vdy5nZXRUaW1lKCkgKyB0aGlzLmVtYWlsVmVyaWZ5VG9rZW5WYWxpZGl0eUR1cmF0aW9uICogMTAwMFxuICAgICk7XG4gIH1cblxuICBnZW5lcmF0ZVBhc3N3b3JkUmVzZXRUb2tlbkV4cGlyZXNBdCgpIHtcbiAgICBpZiAoXG4gICAgICAhdGhpcy5wYXNzd29yZFBvbGljeSB8fFxuICAgICAgIXRoaXMucGFzc3dvcmRQb2xpY3kucmVzZXRUb2tlblZhbGlkaXR5RHVyYXRpb25cbiAgICApIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgcmV0dXJuIG5ldyBEYXRlKFxuICAgICAgbm93LmdldFRpbWUoKSArIHRoaXMucGFzc3dvcmRQb2xpY3kucmVzZXRUb2tlblZhbGlkaXR5RHVyYXRpb24gKiAxMDAwXG4gICAgKTtcbiAgfVxuXG4gIGdlbmVyYXRlU2Vzc2lvbkV4cGlyZXNBdCgpIHtcbiAgICBpZiAoIXRoaXMuZXhwaXJlSW5hY3RpdmVTZXNzaW9ucykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgcmV0dXJuIG5ldyBEYXRlKG5vdy5nZXRUaW1lKCkgKyB0aGlzLnNlc3Npb25MZW5ndGggKiAxMDAwKTtcbiAgfVxuXG4gIGdldCBpbnZhbGlkTGlua1VSTCgpIHtcbiAgICByZXR1cm4gKFxuICAgICAgdGhpcy5jdXN0b21QYWdlcy5pbnZhbGlkTGluayB8fFxuICAgICAgYCR7dGhpcy5wdWJsaWNTZXJ2ZXJVUkx9L2FwcHMvaW52YWxpZF9saW5rLmh0bWxgXG4gICAgKTtcbiAgfVxuXG4gIGdldCBpbnZhbGlkVmVyaWZpY2F0aW9uTGlua1VSTCgpIHtcbiAgICByZXR1cm4gKFxuICAgICAgdGhpcy5jdXN0b21QYWdlcy5pbnZhbGlkVmVyaWZpY2F0aW9uTGluayB8fFxuICAgICAgYCR7dGhpcy5wdWJsaWNTZXJ2ZXJVUkx9L2FwcHMvaW52YWxpZF92ZXJpZmljYXRpb25fbGluay5odG1sYFxuICAgICk7XG4gIH1cblxuICBnZXQgbGlua1NlbmRTdWNjZXNzVVJMKCkge1xuICAgIHJldHVybiAoXG4gICAgICB0aGlzLmN1c3RvbVBhZ2VzLmxpbmtTZW5kU3VjY2VzcyB8fFxuICAgICAgYCR7dGhpcy5wdWJsaWNTZXJ2ZXJVUkx9L2FwcHMvbGlua19zZW5kX3N1Y2Nlc3MuaHRtbGBcbiAgICApO1xuICB9XG5cbiAgZ2V0IGxpbmtTZW5kRmFpbFVSTCgpIHtcbiAgICByZXR1cm4gKFxuICAgICAgdGhpcy5jdXN0b21QYWdlcy5saW5rU2VuZEZhaWwgfHxcbiAgICAgIGAke3RoaXMucHVibGljU2VydmVyVVJMfS9hcHBzL2xpbmtfc2VuZF9mYWlsLmh0bWxgXG4gICAgKTtcbiAgfVxuXG4gIGdldCB2ZXJpZnlFbWFpbFN1Y2Nlc3NVUkwoKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIHRoaXMuY3VzdG9tUGFnZXMudmVyaWZ5RW1haWxTdWNjZXNzIHx8XG4gICAgICBgJHt0aGlzLnB1YmxpY1NlcnZlclVSTH0vYXBwcy92ZXJpZnlfZW1haWxfc3VjY2Vzcy5odG1sYFxuICAgICk7XG4gIH1cblxuICBnZXQgY2hvb3NlUGFzc3dvcmRVUkwoKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIHRoaXMuY3VzdG9tUGFnZXMuY2hvb3NlUGFzc3dvcmQgfHxcbiAgICAgIGAke3RoaXMucHVibGljU2VydmVyVVJMfS9hcHBzL2Nob29zZV9wYXNzd29yZGBcbiAgICApO1xuICB9XG5cbiAgZ2V0IHJlcXVlc3RSZXNldFBhc3N3b3JkVVJMKCkge1xuICAgIHJldHVybiBgJHt0aGlzLnB1YmxpY1NlcnZlclVSTH0vYXBwcy8ke1xuICAgICAgdGhpcy5hcHBsaWNhdGlvbklkXG4gICAgfS9yZXF1ZXN0X3Bhc3N3b3JkX3Jlc2V0YDtcbiAgfVxuXG4gIGdldCBwYXNzd29yZFJlc2V0U3VjY2Vzc1VSTCgpIHtcbiAgICByZXR1cm4gKFxuICAgICAgdGhpcy5jdXN0b21QYWdlcy5wYXNzd29yZFJlc2V0U3VjY2VzcyB8fFxuICAgICAgYCR7dGhpcy5wdWJsaWNTZXJ2ZXJVUkx9L2FwcHMvcGFzc3dvcmRfcmVzZXRfc3VjY2Vzcy5odG1sYFxuICAgICk7XG4gIH1cblxuICBnZXQgcGFyc2VGcmFtZVVSTCgpIHtcbiAgICByZXR1cm4gdGhpcy5jdXN0b21QYWdlcy5wYXJzZUZyYW1lVVJMO1xuICB9XG5cbiAgZ2V0IHZlcmlmeUVtYWlsVVJMKCkge1xuICAgIHJldHVybiBgJHt0aGlzLnB1YmxpY1NlcnZlclVSTH0vYXBwcy8ke3RoaXMuYXBwbGljYXRpb25JZH0vdmVyaWZ5X2VtYWlsYDtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBDb25maWc7XG5tb2R1bGUuZXhwb3J0cyA9IENvbmZpZztcbiJdfQ==