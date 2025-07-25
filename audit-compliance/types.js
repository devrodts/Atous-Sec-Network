"use strict";
// ============================================================================
// AUDIT & COMPLIANCE SYSTEM - TYPE DEFINITIONS
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitter = exports.ComplianceStatus = void 0;
const events_1 = require("events");
Object.defineProperty(exports, "EventEmitter", { enumerable: true, get: function () { return events_1.EventEmitter; } });
var ComplianceStatus;
(function (ComplianceStatus) {
    ComplianceStatus["COMPLIANT"] = "COMPLIANT";
    ComplianceStatus["NON_COMPLIANT"] = "NON_COMPLIANT";
    ComplianceStatus["PARTIALLY_COMPLIANT"] = "PARTIALLY_COMPLIANT";
    ComplianceStatus["NOT_APPLICABLE"] = "NOT_APPLICABLE";
    ComplianceStatus["PENDING_REVIEW"] = "PENDING_REVIEW";
})(ComplianceStatus || (exports.ComplianceStatus = ComplianceStatus = {}));
//# sourceMappingURL=types.js.map