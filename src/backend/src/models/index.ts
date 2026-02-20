import { Sequelize, DataTypes, Model, Optional } from 'sequelize';
import { config } from '../config/index.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

mkdirSync(dirname(config.db.storage), { recursive: true });

export const sequelize = new Sequelize({
  dialect: config.db.dialect,
  storage: config.db.storage,
  logging: false,
});

// User attributes
interface UserAttributes {
  id: number;
  address: string;
  username: string;
  avatar: string | null;
  trustScore: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'avatar' | 'trustScore'> { }

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number;
  declare address: string;
  declare username: string;
  declare avatar: string | null;
  declare trustScore: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    address: { type: DataTypes.STRING(42), allowNull: false, unique: true },
    username: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    avatar: { type: DataTypes.STRING(500), allowNull: true },
    trustScore: { type: DataTypes.INTEGER, allowNull: false, defaultValue: config.trustScore.initial },
  },
  { sequelize, modelName: 'User', tableName: 'users' }
);

// ApiKey attributes
interface ApiKeyAttributes {
  id: number;
  address: string;
  apiKey: string; // UUID v4
  lastUsedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ApiKeyCreationAttributes extends Optional<ApiKeyAttributes, 'id' | 'lastUsedAt'> { }

export class ApiKey extends Model<ApiKeyAttributes, ApiKeyCreationAttributes> implements ApiKeyAttributes {
  declare id: number;
  declare address: string;
  declare apiKey: string;
  declare lastUsedAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ApiKey.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    address: { type: DataTypes.STRING(42), allowNull: false, unique: true },
    apiKey: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    lastUsedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: 'ApiKey', tableName: 'api_keys' }
);


// Job status enum
export enum JobStatus {
  WaitingOnchainCheck = 'waiting_onchain_check',
  Open = 'open',
  Cancelled = 'cancelled',
  WaitForClaim = 'wait_for_claim',
  WaitOnChainApprove = 'wait_onchain_approve', // AI approved, waiting for setJobDone tx
  Done = 'done',
  Overdue = 'overdue',
  Failed = 'failed',
}

// Job attributes
interface JobAttributes {
  id: number;
  contractJobId: string; // Changed to string to support uint256
  requesterAddress: string;
  doneByAddress: string | null;
  title: string;
  description: string;
  reward: string;
  deadline: Date;
  minTrustScore: number;
  status: JobStatus;
  files: string | null; // JSON array of file URLs
  resultText: string | null;
  resultFiles: string | null; // JSON array of file URLs
  retryCount: number;
  lastCheckAt: Date | null;
  txHash: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface JobCreationAttributes extends Optional<JobAttributes, 'id' | 'doneByAddress' | 'resultText' | 'resultFiles'> { }

export class Job extends Model<JobAttributes, JobCreationAttributes> implements JobAttributes {
  declare id: number;
  declare contractJobId: string;
  declare requesterAddress: string;
  declare doneByAddress: string | null;
  declare title: string;
  declare description: string;
  declare reward: string;
  declare deadline: Date;
  declare minTrustScore: number;
  declare status: JobStatus;
  declare files: string | null;
  declare resultText: string | null;
  declare resultFiles: string | null;
  declare retryCount: number;
  declare lastCheckAt: Date | null;
  declare txHash: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Job.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    contractJobId: { type: DataTypes.STRING(78), allowNull: false, unique: true },
    requesterAddress: { type: DataTypes.STRING(42), allowNull: false },
    doneByAddress: { type: DataTypes.STRING(42), allowNull: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    reward: { type: DataTypes.STRING(78), allowNull: false },
    deadline: { type: DataTypes.DATE, allowNull: false },
    minTrustScore: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.ENUM(...Object.values(JobStatus)), allowNull: false, defaultValue: JobStatus.WaitingOnchainCheck },
    files: { type: DataTypes.TEXT, allowNull: true },
    resultText: { type: DataTypes.TEXT, allowNull: true },
    resultFiles: { type: DataTypes.TEXT, allowNull: true },
    retryCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lastCheckAt: { type: DataTypes.DATE, allowNull: true },
    txHash: { type: DataTypes.STRING(66), allowNull: true },
  },
  { sequelize, modelName: 'Job', tableName: 'jobs' }
);

// Submission status enum
export enum SubmissionStatus {
  PendingReview = 'pending_review',
  Cheated = 'cheated',
  NotApproved = 'not_approved',
  Approved = 'approved',
  WaitOnChainApprove = 'wait_onchain_approve', // AI approved, waiting for setJobDone tx
  Failed = 'failed',                           // setJobDone failed after max retries
}

// Submission attributes
interface SubmissionAttributes {
  id: number;
  jobId: number;
  submitterAddress: string;
  resultText: string;
  resultFiles: string | null; // JSON array of file URLs
  status: SubmissionStatus;
  feedback: string | null;
  submitterTrustScore: number;
  retryCount: number;
  lastRetryAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SubmissionCreationAttributes extends Optional<SubmissionAttributes, 'id' | 'resultFiles' | 'feedback' | 'retryCount' | 'lastRetryAt'> { }

export class Submission extends Model<SubmissionAttributes, SubmissionCreationAttributes> implements SubmissionAttributes {
  declare id: number;
  declare jobId: number;
  declare submitterAddress: string;
  declare resultText: string;
  declare resultFiles: string | null;
  declare status: SubmissionStatus;
  declare feedback: string | null;
  declare submitterTrustScore: number;
  declare retryCount: number;
  declare lastRetryAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare job?: Job; // Association
}

Submission.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    jobId: { type: DataTypes.INTEGER, allowNull: false },
    submitterAddress: { type: DataTypes.STRING(42), allowNull: false },
    resultText: { type: DataTypes.TEXT, allowNull: false },
    resultFiles: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM(...Object.values(SubmissionStatus)), allowNull: false, defaultValue: SubmissionStatus.PendingReview },
    feedback: { type: DataTypes.TEXT, allowNull: true },
    submitterTrustScore: { type: DataTypes.INTEGER, allowNull: false },
    retryCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lastRetryAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, modelName: 'Submission', tableName: 'submissions' }
);

// Relationships
Job.hasMany(Submission, { foreignKey: 'jobId', as: 'submissions' });
Submission.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

export async function initDb() {
  await sequelize.sync({ alter: true });
  console.log('Database synchronized');
}
