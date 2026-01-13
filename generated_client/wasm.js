
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  userId: 'userId',
  fullName: 'fullName',
  mobileNumber: 'mobileNumber',
  childInAchariya: 'childInAchariya',
  childName: 'childName',
  grade: 'grade',
  campusId: 'campusId',
  bankAccountDetails: 'bankAccountDetails',
  referralCode: 'referralCode',
  confirmedReferralCount: 'confirmedReferralCount',
  yearFeeBenefitPercent: 'yearFeeBenefitPercent',
  longTermBenefitPercent: 'longTermBenefitPercent',
  lastActiveYear: 'lastActiveYear',
  isFiveStarMember: 'isFiveStarMember',
  assignedCampus: 'assignedCampus',
  studentFee: 'studentFee',
  academicYear: 'academicYear',
  createdAt: 'createdAt',
  profileImage: 'profileImage',
  email: 'email',
  address: 'address',
  paymentAmount: 'paymentAmount',
  paymentStatus: 'paymentStatus',
  transactionId: 'transactionId',
  aadharNo: 'aadharNo',
  childEprNo: 'childEprNo',
  empId: 'empId',
  password: 'password',
  deletionRequestedAt: 'deletionRequestedAt',
  role: 'role',
  status: 'status',
  benefitStatus: 'benefitStatus'
};

exports.Prisma.StudentScalarFieldEnum = {
  studentId: 'studentId',
  fullName: 'fullName',
  parentId: 'parentId',
  campusId: 'campusId',
  grade: 'grade',
  section: 'section',
  rollNumber: 'rollNumber',
  academicYear: 'academicYear',
  status: 'status',
  baseFee: 'baseFee',
  discountPercent: 'discountPercent',
  referralLeadId: 'referralLeadId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  ambassadorId: 'ambassadorId',
  admissionNumber: 'admissionNumber',
  selectedFeeType: 'selectedFeeType',
  annualFee: 'annualFee'
};

exports.Prisma.ReferralLeadScalarFieldEnum = {
  leadId: 'leadId',
  userId: 'userId',
  parentName: 'parentName',
  parentMobile: 'parentMobile',
  campusId: 'campusId',
  campus: 'campus',
  gradeInterested: 'gradeInterested',
  admittedYear: 'admittedYear',
  confirmedDate: 'confirmedDate',
  createdAt: 'createdAt',
  studentName: 'studentName',
  leadStatus: 'leadStatus',
  admissionNumber: 'admissionNumber',
  section: 'section',
  selectedFeeType: 'selectedFeeType',
  annualFee: 'annualFee'
};

exports.Prisma.BenefitSlabScalarFieldEnum = {
  slabId: 'slabId',
  tierName: 'tierName',
  referralCount: 'referralCount',
  yearFeeBenefitPercent: 'yearFeeBenefitPercent',
  longTermExtraPercent: 'longTermExtraPercent',
  baseLongTermPercent: 'baseLongTermPercent',
  description: 'description'
};

exports.Prisma.AdminScalarFieldEnum = {
  adminId: 'adminId',
  adminName: 'adminName',
  adminMobile: 'adminMobile',
  assignedCampus: 'assignedCampus',
  createdAt: 'createdAt',
  profileImage: 'profileImage',
  email: 'email',
  address: 'address',
  password: 'password',
  role: 'role',
  status: 'status'
};

exports.Prisma.SystemSettingsScalarFieldEnum = {
  id: 'id',
  allowNewRegistrations: 'allowNewRegistrations',
  defaultStudentFee: 'defaultStudentFee',
  maintenanceMode: 'maintenanceMode',
  staffReferralText: 'staffReferralText',
  parentReferralText: 'parentReferralText',
  staffWelcomeMessage: 'staffWelcomeMessage',
  parentWelcomeMessage: 'parentWelcomeMessage',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  alumniReferralText: 'alumniReferralText',
  alumniWelcomeMessage: 'alumniWelcomeMessage'
};

exports.Prisma.AcademicYearScalarFieldEnum = {
  id: 'id',
  year: 'year',
  startDate: 'startDate',
  endDate: 'endDate',
  isActive: 'isActive',
  isCurrent: 'isCurrent',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LeadManagementSettingsScalarFieldEnum = {
  id: 'id',
  autoAssignLeads: 'autoAssignLeads',
  leadStaleDays: 'leadStaleDays',
  followupEscalationDays: 'followupEscalationDays',
  duplicateDetectionEnabled: 'duplicateDetectionEnabled',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.SecuritySettingsScalarFieldEnum = {
  id: 'id',
  sessionTimeoutMinutes: 'sessionTimeoutMinutes',
  maxLoginAttempts: 'maxLoginAttempts',
  passwordResetExpiryHours: 'passwordResetExpiryHours',
  twoFactorAuthEnabled: 'twoFactorAuthEnabled',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  ipWhitelist: 'ipWhitelist'
};

exports.Prisma.DataRetentionSettingsScalarFieldEnum = {
  id: 'id',
  keepInactiveDataMonths: 'keepInactiveDataMonths',
  archiveLeadsAfterDays: 'archiveLeadsAfterDays',
  backupFrequencyDays: 'backupFrequencyDays',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.RolePermissionsScalarFieldEnum = {
  id: 'id',
  role: 'role',
  analyticsAccess: 'analyticsAccess',
  analyticsScope: 'analyticsScope',
  userMgmtAccess: 'userMgmtAccess',
  userMgmtScope: 'userMgmtScope',
  userMgmtCreate: 'userMgmtCreate',
  userMgmtEdit: 'userMgmtEdit',
  userMgmtDelete: 'userMgmtDelete',
  studentMgmtAccess: 'studentMgmtAccess',
  studentMgmtScope: 'studentMgmtScope',
  adminMgmtAccess: 'adminMgmtAccess',
  adminMgmtScope: 'adminMgmtScope',
  adminMgmtCreate: 'adminMgmtCreate',
  adminMgmtEdit: 'adminMgmtEdit',
  adminMgmtDelete: 'adminMgmtDelete',
  campusPerfAccess: 'campusPerfAccess',
  campusPerfScope: 'campusPerfScope',
  reportsAccess: 'reportsAccess',
  reportsScope: 'reportsScope',
  settlementsAccess: 'settlementsAccess',
  settlementsScope: 'settlementsScope',
  marketingKitAccess: 'marketingKitAccess',
  marketingKitScope: 'marketingKitScope',
  auditLogAccess: 'auditLogAccess',
  auditLogScope: 'auditLogScope',
  supportDeskAccess: 'supportDeskAccess',
  supportDeskScope: 'supportDeskScope',
  referralSubmissionAccess: 'referralSubmissionAccess',
  referralSubmissionScope: 'referralSubmissionScope',
  referralTrackingAccess: 'referralTrackingAccess',
  referralTrackingScope: 'referralTrackingScope',
  savingsCalculatorAccess: 'savingsCalculatorAccess',
  savingsCalculatorScope: 'savingsCalculatorScope',
  rulesAccessAccess: 'rulesAccessAccess',
  rulesAccessScope: 'rulesAccessScope',
  settingsAccess: 'settingsAccess',
  settingsScope: 'settingsScope',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  studentMgmtCreate: 'studentMgmtCreate',
  studentMgmtDelete: 'studentMgmtDelete',
  studentMgmtEdit: 'studentMgmtEdit',
  deletionHubAccess: 'deletionHubAccess',
  deletionHubScope: 'deletionHubScope',
  passwordResetAccess: 'passwordResetAccess',
  passwordResetScope: 'passwordResetScope',
  engagementCentreAccess: 'engagementCentreAccess',
  engagementCentreScope: 'engagementCentreScope',
  feeManagementAccess: 'feeManagementAccess',
  feeManagementScope: 'feeManagementScope'
};

exports.Prisma.SettlementScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  amount: 'amount',
  status: 'status',
  paymentMethod: 'paymentMethod',
  bankReference: 'bankReference',
  payoutDate: 'payoutDate',
  processedBy: 'processedBy',
  remarks: 'remarks',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ResourceScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  type: 'type',
  category: 'category',
  fileUrl: 'fileUrl',
  thumbnailUrl: 'thumbnailUrl',
  isActive: 'isActive',
  uploadedBy: 'uploadedBy',
  createdAt: 'createdAt'
};

exports.Prisma.ActivityLogScalarFieldEnum = {
  id: 'id',
  adminId: 'adminId',
  userId: 'userId',
  action: 'action',
  module: 'module',
  targetId: 'targetId',
  description: 'description',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt',
  metadata: 'metadata'
};

exports.Prisma.SupportTicketScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  subject: 'subject',
  category: 'category',
  priority: 'priority',
  status: 'status',
  assignedAdminId: 'assignedAdminId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  campus: 'campus',
  message: 'message',
  resolvedAt: 'resolvedAt',
  escalationLevel: 'escalationLevel',
  lastEscalatedAt: 'lastEscalatedAt'
};

exports.Prisma.TicketMessageScalarFieldEnum = {
  id: 'id',
  ticketId: 'ticketId',
  senderId: 'senderId',
  senderType: 'senderType',
  message: 'message',
  isInternal: 'isInternal',
  createdAt: 'createdAt'
};

exports.Prisma.CampusScalarFieldEnum = {
  id: 'id',
  campusName: 'campusName',
  campusCode: 'campusCode',
  location: 'location',
  grades: 'grades',
  maxCapacity: 'maxCapacity',
  currentEnrollment: 'currentEnrollment',
  isActive: 'isActive',
  campusHeadId: 'campusHeadId',
  contactEmail: 'contactEmail',
  contactPhone: 'contactPhone',
  address: 'address',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CampusTargetScalarFieldEnum = {
  id: 'id',
  campusId: 'campusId',
  month: 'month',
  year: 'year',
  leadTarget: 'leadTarget',
  admissionTarget: 'admissionTarget',
  updatedAt: 'updatedAt'
};

exports.Prisma.GradeFeeScalarFieldEnum = {
  id: 'id',
  grade: 'grade',
  annualFee_otp: 'annualFee_otp',
  annualFee_wotp: 'annualFee_wotp',
  campusId: 'campusId',
  academicYear: 'academicYear'
};

exports.Prisma.NotificationSettingsScalarFieldEnum = {
  id: 'id',
  emailNotifications: 'emailNotifications',
  smsNotifications: 'smsNotifications',
  whatsappNotifications: 'whatsappNotifications',
  leadFollowupReminders: 'leadFollowupReminders',
  reminderFrequencyDays: 'reminderFrequencyDays',
  notifySuperAdminOnNewAdmins: 'notifySuperAdminOnNewAdmins',
  notifyCampusHeadOnNewLeads: 'notifyCampusHeadOnNewLeads',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.MarketingAssetScalarFieldEnum = {
  id: 'id',
  name: 'name',
  category: 'category',
  description: 'description',
  fileUrl: 'fileUrl',
  fileType: 'fileType',
  fileSize: 'fileSize',
  isActive: 'isActive',
  sortOrder: 'sortOrder',
  uploadedById: 'uploadedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OtpVerificationScalarFieldEnum = {
  id: 'id',
  mobile: 'mobile',
  otp: 'otp',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  adminId: 'adminId',
  title: 'title',
  message: 'message',
  type: 'type',
  link: 'link',
  isRead: 'isRead',
  createdAt: 'createdAt'
};

exports.Prisma.CampaignScalarFieldEnum = {
  id: 'id',
  name: 'name',
  subject: 'subject',
  templateBody: 'templateBody',
  type: 'type',
  status: 'status',
  targetAudience: 'targetAudience',
  schedule: 'schedule',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  lastRunAt: 'lastRunAt'
};

exports.Prisma.CampaignLogScalarFieldEnum = {
  id: 'id',
  campaignId: 'campaignId',
  runAt: 'runAt',
  status: 'status',
  recipientCount: 'recipientCount',
  sentCount: 'sentCount',
  failedCount: 'failedCount',
  errorLog: 'errorLog'
};

exports.Prisma.RateLimitScalarFieldEnum = {
  key: 'key',
  count: 'count',
  resetAt: 'resetAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.UserRole = exports.$Enums.UserRole = {
  Parent: 'Parent',
  Staff: 'Staff',
  Alumni: 'Alumni',
  Others: 'Others'
};

exports.AccountStatus = exports.$Enums.AccountStatus = {
  Active: 'Active',
  Inactive: 'Inactive',
  Pending: 'Pending',
  Suspended: 'Suspended',
  Deletion_Requested: 'Deletion_Requested',
  Deleted: 'Deleted'
};

exports.FeeType = exports.$Enums.FeeType = {
  OTP: 'OTP',
  WOTP: 'WOTP'
};

exports.LeadStatus = exports.$Enums.LeadStatus = {
  New: 'New',
  Interested: 'Interested',
  Contacted: 'Contacted',
  Follow_up: 'Follow_up',
  Confirmed: 'Confirmed',
  Admitted: 'Admitted',
  Closed: 'Closed',
  Rejected: 'Rejected'
};

exports.AdminRole = exports.$Enums.AdminRole = {
  Super_Admin: 'Super_Admin',
  Finance_Admin: 'Finance_Admin',
  Campus_Head: 'Campus_Head',
  Admission_Admin: 'Admission_Admin',
  Campus_Admin: 'Campus_Admin'
};

exports.Prisma.ModelName = {
  User: 'User',
  Student: 'Student',
  ReferralLead: 'ReferralLead',
  BenefitSlab: 'BenefitSlab',
  Admin: 'Admin',
  SystemSettings: 'SystemSettings',
  AcademicYear: 'AcademicYear',
  LeadManagementSettings: 'LeadManagementSettings',
  SecuritySettings: 'SecuritySettings',
  DataRetentionSettings: 'DataRetentionSettings',
  RolePermissions: 'RolePermissions',
  Settlement: 'Settlement',
  Resource: 'Resource',
  ActivityLog: 'ActivityLog',
  SupportTicket: 'SupportTicket',
  TicketMessage: 'TicketMessage',
  Campus: 'Campus',
  CampusTarget: 'CampusTarget',
  GradeFee: 'GradeFee',
  NotificationSettings: 'NotificationSettings',
  MarketingAsset: 'MarketingAsset',
  OtpVerification: 'OtpVerification',
  Notification: 'Notification',
  Campaign: 'Campaign',
  CampaignLog: 'CampaignLog',
  RateLimit: 'RateLimit'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
