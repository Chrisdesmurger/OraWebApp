'use client';

import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { CommandName, CommandLog } from '@/lib/types/commands';
import { COMMANDS } from '@/lib/types/commands';

interface CommandExecutionState {
  commandName: CommandName | null;
  isRunning: boolean;
  output: string[];
  error: string | null;
  success: boolean | null;
  duration: number | null;
}

export default function AdminCommandsPage() {
  const [executionState, setExecutionState] = useState<CommandExecutionState>({
    commandName: null,
    isRunning: false,
    output: [],
    error: null,
    success: null,
    duration: null,
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    commandName: CommandName | null;
  }>({
    open: false,
    commandName: null,
  });

  const [commandHistory, setCommandHistory] = useState<CommandLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load command history on mount
  useEffect(() => {
    loadCommandHistory();
  }, []);

  const loadCommandHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await fetchWithAuth('/api/admin/commands/logs?limit=10');
      const data = await response.json();

      if (data.success) {
        setCommandHistory(data.logs);
      }
    } catch (error) {
      console.error('Failed to load command history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleExecuteCommand = (commandName: CommandName) => {
    const command = COMMANDS[commandName];

    // Show confirmation dialog for destructive commands
    if (command.destructive) {
      setConfirmDialog({
        open: true,
        commandName,
      });
    } else {
      executeCommand(commandName);
    }
  };

  const executeCommand = async (commandName: CommandName) => {
    setExecutionState({
      commandName,
      isRunning: true,
      output: [],
      error: null,
      success: null,
      duration: null,
    });

    setConfirmDialog({ open: false, commandName: null });

    try {
      const response = await fetchWithAuth('/api/admin/commands/execute', {
        method: 'POST',
        body: JSON.stringify({ commandName }),
      });

      const result = await response.json();

      setExecutionState({
        commandName,
        isRunning: false,
        output: result.output || [],
        error: result.error || null,
        success: result.success,
        duration: result.duration || null,
      });

      // Reload history after execution
      loadCommandHistory();
    } catch (error: any) {
      setExecutionState({
        commandName,
        isRunning: false,
        output: [],
        error: error.message || 'Command execution failed',
        success: false,
        duration: null,
      });
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  const formatTimestamp = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Commands</h1>
        <p className="text-muted-foreground">
          Execute administrative commands to manage demo data and seed the database.
        </p>
      </div>

      {/* Available Commands */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {Object.values(COMMANDS).map((command) => (
          <Card key={command.name} className={command.destructive ? 'border-red-200' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{command.icon}</span>
                {command.displayName}
              </CardTitle>
              <CardDescription>{command.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleExecuteCommand(command.name)}
                disabled={executionState.isRunning}
                variant={command.destructive ? 'destructive' : 'default'}
                className="w-full"
              >
                {executionState.isRunning && executionState.commandName === command.name
                  ? 'Running...'
                  : 'Execute'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Execution Output */}
      {(executionState.output.length > 0 || executionState.error) && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                Command Output:{' '}
                {executionState.commandName && COMMANDS[executionState.commandName].displayName}
              </span>
              {executionState.duration && (
                <span className="text-sm font-normal text-muted-foreground">
                  Duration: {formatDuration(executionState.duration)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {executionState.success !== null && (
              <Alert variant={executionState.success ? 'default' : 'destructive'} className="mb-4">
                {executionState.success ? 'Command completed successfully' : 'Command failed'}
              </Alert>
            )}

            {executionState.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 font-semibold">Error:</p>
                <p className="text-red-700 font-mono text-sm">{executionState.error}</p>
              </div>
            )}

            <div className="bg-black rounded-lg p-4 overflow-auto max-h-96">
              <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                {executionState.output.join('\n')}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Command History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Command History</span>
            <Button variant="outline" size="sm" onClick={loadCommandHistory}>
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>Recent command executions (last 10)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <p className="text-center text-muted-foreground py-8">Loading history...</p>
          ) : commandHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No commands executed yet</p>
          ) : (
            <div className="space-y-4">
              {commandHistory.map((log) => (
                <div
                  key={log.id}
                  className={`border rounded-lg p-4 ${
                    log.status === 'success'
                      ? 'border-green-200 bg-green-50'
                      : log.status === 'error'
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{COMMANDS[log.commandName]?.icon}</span>
                        <h4 className="font-semibold">
                          {COMMANDS[log.commandName]?.displayName || log.commandName}
                        </h4>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            log.status === 'success'
                              ? 'bg-green-200 text-green-800'
                              : log.status === 'error'
                              ? 'bg-red-200 text-red-800'
                              : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Executed by {log.executedBy.email} on {formatTimestamp(log.startedAt)}
                      </p>
                    </div>
                    {log.duration && (
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(log.duration)}
                      </span>
                    )}
                  </div>

                  {log.error && (
                    <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-800">
                      <strong>Error:</strong> {log.error}
                    </div>
                  )}

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                        View metadata
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Destructive Action</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.commandName && COMMANDS[confirmDialog.commandName].confirmationMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDialog.commandName && executeCommand(confirmDialog.commandName)}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
