import React from "react";

export interface TaskRunnerProps {
    tasks: Array<{
        id: string;
        name: string;
        description: string;
    }>;
    isRunning: boolean;
    results: Array<{
        taskId: string;
        status: string;
        message: string;
    }>;
}

export default function TaskRunner({ tasks, isRunning, results }: TaskRunnerProps) {
    const getTaskStatus = (taskId: string) => {
        const result = results.find(r => r.taskId === taskId);
        if (!result) return isRunning ? 'pending' : 'not-started';
        return result.status;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'text-green-600';
            case 'failed': return 'text-red-600';
            case 'running': return 'text-blue-600';
            default: return 'text-gray-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return '✓';
            case 'failed': return '✗';
            case 'running': return '⟳';
            default: return '○';
        }
    };

    return (
        <div className="space-y-4">
            {tasks.map((task) => {
                const status = getTaskStatus(task.id);
                const result = results.find(r => r.taskId === task.id);
                
                return (
                    <div
                        key={task.id}
                        className="border rounded-lg p-4 bg-gray-50"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900">{task.name}</h3>
                                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                {result && (
                                    <p className="text-sm mt-2 text-gray-700">{result.message}</p>
                                )}
                            </div>
                            <div className={`ml-4 text-lg ${getStatusColor(status)}`}>
                                <span className="inline-flex items-center">
                                    {getStatusIcon(status)}
                                    <span className="ml-2 text-sm capitalize">{status.replace('-', ' ')}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
