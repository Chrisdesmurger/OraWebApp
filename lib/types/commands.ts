/**
 * Admin Command Types
 * Type definitions for admin commands and execution logs
 */

export type CommandName =
  | 'seedFakeUsers'
  | 'purgeFakeUsers'
  | 'seedSampleContent'
  | 'wipeDemoData';

export type CommandStatus = 'pending' | 'running' | 'success' | 'error';

export interface CommandDefinition {
  name: CommandName;
  displayName: string;
  description: string;
  destructive: boolean;
  confirmationMessage?: string;
  icon: string;
}

export interface CommandExecution {
  id: string;
  commandName: CommandName;
  status: CommandStatus;
  startedAt: Date;
  completedAt?: Date;
  executedBy: {
    uid: string;
    email: string;
  };
  output: string[];
  error?: string;
  metadata?: Record<string, any>;
}

export interface CommandLog {
  id: string;
  commandName: CommandName;
  status: CommandStatus;
  startedAt: string; // ISO timestamp
  completedAt?: string; // ISO timestamp
  executedBy: {
    uid: string;
    email: string;
  };
  output: string[];
  error?: string;
  duration?: number; // milliseconds
  metadata?: Record<string, any>;
}

export interface CommandResult {
  success: boolean;
  output: string[];
  error?: string;
  metadata?: Record<string, any>;
}

export const COMMANDS: Record<CommandName, CommandDefinition> = {
  seedFakeUsers: {
    name: 'seedFakeUsers',
    displayName: 'Seed Fake Users',
    description: 'Generate 10 fake users with sample data for testing',
    destructive: false,
    icon: '👥',
  },
  purgeFakeUsers: {
    name: 'purgeFakeUsers',
    displayName: 'Purge Fake Users',
    description: 'Remove all fake users created by seedFakeUsers command',
    destructive: true,
    confirmationMessage: 'Are you sure you want to delete all fake users? This action cannot be undone.',
    icon: '🗑️',
  },
  seedSampleContent: {
    name: 'seedSampleContent',
    displayName: 'Seed Sample Content',
    description: 'Add sample meditation/yoga programs and lessons to the database',
    destructive: false,
    icon: '📚',
  },
  wipeDemoData: {
    name: 'wipeDemoData',
    displayName: 'Wipe Demo Data',
    description: 'Delete all demo data (fake users + sample content)',
    destructive: true,
    confirmationMessage: 'WARNING: This will delete ALL demo data including fake users and sample content. This action cannot be undone. Are you absolutely sure?',
    icon: '⚠️',
  },
};
