"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.CacheController = exports.SubCache = void 0;

var _AdaptableController = _interopRequireDefault(require("./AdaptableController"));

var _CacheAdapter = _interopRequireDefault(require("../Adapters/Cache/CacheAdapter"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const KEY_SEPARATOR_CHAR = ':';

function joinKeys(...keys) {
  return keys.join(KEY_SEPARATOR_CHAR);
}
/**
 * Prefix all calls to the cache via a prefix string, useful when grouping Cache by object type.
 *
 * eg "Role" or "Session"
 */


class SubCache {
  constructor(prefix, cacheController, ttl) {
    this.prefix = prefix;
    this.cache = cacheController;
    this.ttl = ttl;
  }

  get(key) {
    const cacheKey = joinKeys(this.prefix, key);
    return this.cache.get(cacheKey);
  }

  put(key, value, ttl) {
    const cacheKey = joinKeys(this.prefix, key);
    return this.cache.put(cacheKey, value, ttl);
  }

  del(key) {
    const cacheKey = joinKeys(this.prefix, key);
    return this.cache.del(cacheKey);
  }

  clear() {
    return this.cache.clear();
  }

}

exports.SubCache = SubCache;

class CacheController extends _AdaptableController.default {
  constructor(adapter, appId, options = {}) {
    super(adapter, appId, options);
    this.role = new SubCache('role', this);
    this.user = new SubCache('user', this);
  }

  get(key) {
    const cacheKey = joinKeys(this.appId, key);
    return this.adapter.get(cacheKey).then(null, () => Promise.resolve(null));
  }

  put(key, value, ttl) {
    const cacheKey = joinKeys(this.appId, key);
    return this.adapter.put(cacheKey, value, ttl);
  }

  del(key) {
    const cacheKey = joinKeys(this.appId, key);
    return this.adapter.del(cacheKey);
  }

  clear() {
    return this.adapter.clear();
  }

  expectedAdapterType() {
    return _CacheAdapter.default;
  }

}

exports.CacheController = CacheController;
var _default = CacheController;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Db250cm9sbGVycy9DYWNoZUNvbnRyb2xsZXIuanMiXSwibmFtZXMiOlsiS0VZX1NFUEFSQVRPUl9DSEFSIiwiam9pbktleXMiLCJrZXlzIiwiam9pbiIsIlN1YkNhY2hlIiwiY29uc3RydWN0b3IiLCJwcmVmaXgiLCJjYWNoZUNvbnRyb2xsZXIiLCJ0dGwiLCJjYWNoZSIsImdldCIsImtleSIsImNhY2hlS2V5IiwicHV0IiwidmFsdWUiLCJkZWwiLCJjbGVhciIsIkNhY2hlQ29udHJvbGxlciIsIkFkYXB0YWJsZUNvbnRyb2xsZXIiLCJhZGFwdGVyIiwiYXBwSWQiLCJvcHRpb25zIiwicm9sZSIsInVzZXIiLCJ0aGVuIiwiUHJvbWlzZSIsInJlc29sdmUiLCJleHBlY3RlZEFkYXB0ZXJUeXBlIiwiQ2FjaGVBZGFwdGVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBQ0E7Ozs7QUFFQSxNQUFNQSxrQkFBa0IsR0FBRyxHQUEzQjs7QUFFQSxTQUFTQyxRQUFULENBQWtCLEdBQUdDLElBQXJCLEVBQTJCO0FBQ3pCLFNBQU9BLElBQUksQ0FBQ0MsSUFBTCxDQUFVSCxrQkFBVixDQUFQO0FBQ0Q7QUFFRDs7Ozs7OztBQUtPLE1BQU1JLFFBQU4sQ0FBZTtBQUNwQkMsRUFBQUEsV0FBVyxDQUFDQyxNQUFELEVBQVNDLGVBQVQsRUFBMEJDLEdBQTFCLEVBQStCO0FBQ3hDLFNBQUtGLE1BQUwsR0FBY0EsTUFBZDtBQUNBLFNBQUtHLEtBQUwsR0FBYUYsZUFBYjtBQUNBLFNBQUtDLEdBQUwsR0FBV0EsR0FBWDtBQUNEOztBQUVERSxFQUFBQSxHQUFHLENBQUNDLEdBQUQsRUFBTTtBQUNQLFVBQU1DLFFBQVEsR0FBR1gsUUFBUSxDQUFDLEtBQUtLLE1BQU4sRUFBY0ssR0FBZCxDQUF6QjtBQUNBLFdBQU8sS0FBS0YsS0FBTCxDQUFXQyxHQUFYLENBQWVFLFFBQWYsQ0FBUDtBQUNEOztBQUVEQyxFQUFBQSxHQUFHLENBQUNGLEdBQUQsRUFBTUcsS0FBTixFQUFhTixHQUFiLEVBQWtCO0FBQ25CLFVBQU1JLFFBQVEsR0FBR1gsUUFBUSxDQUFDLEtBQUtLLE1BQU4sRUFBY0ssR0FBZCxDQUF6QjtBQUNBLFdBQU8sS0FBS0YsS0FBTCxDQUFXSSxHQUFYLENBQWVELFFBQWYsRUFBeUJFLEtBQXpCLEVBQWdDTixHQUFoQyxDQUFQO0FBQ0Q7O0FBRURPLEVBQUFBLEdBQUcsQ0FBQ0osR0FBRCxFQUFNO0FBQ1AsVUFBTUMsUUFBUSxHQUFHWCxRQUFRLENBQUMsS0FBS0ssTUFBTixFQUFjSyxHQUFkLENBQXpCO0FBQ0EsV0FBTyxLQUFLRixLQUFMLENBQVdNLEdBQVgsQ0FBZUgsUUFBZixDQUFQO0FBQ0Q7O0FBRURJLEVBQUFBLEtBQUssR0FBRztBQUNOLFdBQU8sS0FBS1AsS0FBTCxDQUFXTyxLQUFYLEVBQVA7QUFDRDs7QUF4Qm1COzs7O0FBMkJmLE1BQU1DLGVBQU4sU0FBOEJDLDRCQUE5QixDQUFrRDtBQUN2RGIsRUFBQUEsV0FBVyxDQUFDYyxPQUFELEVBQVVDLEtBQVYsRUFBaUJDLE9BQU8sR0FBRyxFQUEzQixFQUErQjtBQUN4QyxVQUFNRixPQUFOLEVBQWVDLEtBQWYsRUFBc0JDLE9BQXRCO0FBRUEsU0FBS0MsSUFBTCxHQUFZLElBQUlsQixRQUFKLENBQWEsTUFBYixFQUFxQixJQUFyQixDQUFaO0FBQ0EsU0FBS21CLElBQUwsR0FBWSxJQUFJbkIsUUFBSixDQUFhLE1BQWIsRUFBcUIsSUFBckIsQ0FBWjtBQUNEOztBQUVETSxFQUFBQSxHQUFHLENBQUNDLEdBQUQsRUFBTTtBQUNQLFVBQU1DLFFBQVEsR0FBR1gsUUFBUSxDQUFDLEtBQUttQixLQUFOLEVBQWFULEdBQWIsQ0FBekI7QUFDQSxXQUFPLEtBQUtRLE9BQUwsQ0FBYVQsR0FBYixDQUFpQkUsUUFBakIsRUFBMkJZLElBQTNCLENBQWdDLElBQWhDLEVBQXNDLE1BQU1DLE9BQU8sQ0FBQ0MsT0FBUixDQUFnQixJQUFoQixDQUE1QyxDQUFQO0FBQ0Q7O0FBRURiLEVBQUFBLEdBQUcsQ0FBQ0YsR0FBRCxFQUFNRyxLQUFOLEVBQWFOLEdBQWIsRUFBa0I7QUFDbkIsVUFBTUksUUFBUSxHQUFHWCxRQUFRLENBQUMsS0FBS21CLEtBQU4sRUFBYVQsR0FBYixDQUF6QjtBQUNBLFdBQU8sS0FBS1EsT0FBTCxDQUFhTixHQUFiLENBQWlCRCxRQUFqQixFQUEyQkUsS0FBM0IsRUFBa0NOLEdBQWxDLENBQVA7QUFDRDs7QUFFRE8sRUFBQUEsR0FBRyxDQUFDSixHQUFELEVBQU07QUFDUCxVQUFNQyxRQUFRLEdBQUdYLFFBQVEsQ0FBQyxLQUFLbUIsS0FBTixFQUFhVCxHQUFiLENBQXpCO0FBQ0EsV0FBTyxLQUFLUSxPQUFMLENBQWFKLEdBQWIsQ0FBaUJILFFBQWpCLENBQVA7QUFDRDs7QUFFREksRUFBQUEsS0FBSyxHQUFHO0FBQ04sV0FBTyxLQUFLRyxPQUFMLENBQWFILEtBQWIsRUFBUDtBQUNEOztBQUVEVyxFQUFBQSxtQkFBbUIsR0FBRztBQUNwQixXQUFPQyxxQkFBUDtBQUNEOztBQTdCc0Q7OztlQWdDMUNYLGUiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQWRhcHRhYmxlQ29udHJvbGxlciBmcm9tICcuL0FkYXB0YWJsZUNvbnRyb2xsZXInO1xuaW1wb3J0IENhY2hlQWRhcHRlciBmcm9tICcuLi9BZGFwdGVycy9DYWNoZS9DYWNoZUFkYXB0ZXInO1xuXG5jb25zdCBLRVlfU0VQQVJBVE9SX0NIQVIgPSAnOic7XG5cbmZ1bmN0aW9uIGpvaW5LZXlzKC4uLmtleXMpIHtcbiAgcmV0dXJuIGtleXMuam9pbihLRVlfU0VQQVJBVE9SX0NIQVIpO1xufVxuXG4vKipcbiAqIFByZWZpeCBhbGwgY2FsbHMgdG8gdGhlIGNhY2hlIHZpYSBhIHByZWZpeCBzdHJpbmcsIHVzZWZ1bCB3aGVuIGdyb3VwaW5nIENhY2hlIGJ5IG9iamVjdCB0eXBlLlxuICpcbiAqIGVnIFwiUm9sZVwiIG9yIFwiU2Vzc2lvblwiXG4gKi9cbmV4cG9ydCBjbGFzcyBTdWJDYWNoZSB7XG4gIGNvbnN0cnVjdG9yKHByZWZpeCwgY2FjaGVDb250cm9sbGVyLCB0dGwpIHtcbiAgICB0aGlzLnByZWZpeCA9IHByZWZpeDtcbiAgICB0aGlzLmNhY2hlID0gY2FjaGVDb250cm9sbGVyO1xuICAgIHRoaXMudHRsID0gdHRsO1xuICB9XG5cbiAgZ2V0KGtleSkge1xuICAgIGNvbnN0IGNhY2hlS2V5ID0gam9pbktleXModGhpcy5wcmVmaXgsIGtleSk7XG4gICAgcmV0dXJuIHRoaXMuY2FjaGUuZ2V0KGNhY2hlS2V5KTtcbiAgfVxuXG4gIHB1dChrZXksIHZhbHVlLCB0dGwpIHtcbiAgICBjb25zdCBjYWNoZUtleSA9IGpvaW5LZXlzKHRoaXMucHJlZml4LCBrZXkpO1xuICAgIHJldHVybiB0aGlzLmNhY2hlLnB1dChjYWNoZUtleSwgdmFsdWUsIHR0bCk7XG4gIH1cblxuICBkZWwoa2V5KSB7XG4gICAgY29uc3QgY2FjaGVLZXkgPSBqb2luS2V5cyh0aGlzLnByZWZpeCwga2V5KTtcbiAgICByZXR1cm4gdGhpcy5jYWNoZS5kZWwoY2FjaGVLZXkpO1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FjaGUuY2xlYXIoKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ2FjaGVDb250cm9sbGVyIGV4dGVuZHMgQWRhcHRhYmxlQ29udHJvbGxlciB7XG4gIGNvbnN0cnVjdG9yKGFkYXB0ZXIsIGFwcElkLCBvcHRpb25zID0ge30pIHtcbiAgICBzdXBlcihhZGFwdGVyLCBhcHBJZCwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLnJvbGUgPSBuZXcgU3ViQ2FjaGUoJ3JvbGUnLCB0aGlzKTtcbiAgICB0aGlzLnVzZXIgPSBuZXcgU3ViQ2FjaGUoJ3VzZXInLCB0aGlzKTtcbiAgfVxuXG4gIGdldChrZXkpIHtcbiAgICBjb25zdCBjYWNoZUtleSA9IGpvaW5LZXlzKHRoaXMuYXBwSWQsIGtleSk7XG4gICAgcmV0dXJuIHRoaXMuYWRhcHRlci5nZXQoY2FjaGVLZXkpLnRoZW4obnVsbCwgKCkgPT4gUHJvbWlzZS5yZXNvbHZlKG51bGwpKTtcbiAgfVxuXG4gIHB1dChrZXksIHZhbHVlLCB0dGwpIHtcbiAgICBjb25zdCBjYWNoZUtleSA9IGpvaW5LZXlzKHRoaXMuYXBwSWQsIGtleSk7XG4gICAgcmV0dXJuIHRoaXMuYWRhcHRlci5wdXQoY2FjaGVLZXksIHZhbHVlLCB0dGwpO1xuICB9XG5cbiAgZGVsKGtleSkge1xuICAgIGNvbnN0IGNhY2hlS2V5ID0gam9pbktleXModGhpcy5hcHBJZCwga2V5KTtcbiAgICByZXR1cm4gdGhpcy5hZGFwdGVyLmRlbChjYWNoZUtleSk7XG4gIH1cblxuICBjbGVhcigpIHtcbiAgICByZXR1cm4gdGhpcy5hZGFwdGVyLmNsZWFyKCk7XG4gIH1cblxuICBleHBlY3RlZEFkYXB0ZXJUeXBlKCkge1xuICAgIHJldHVybiBDYWNoZUFkYXB0ZXI7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQ2FjaGVDb250cm9sbGVyO1xuIl19