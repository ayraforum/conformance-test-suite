'use client';

import { useEffect, useState } from 'react';

type TestRun = {
  id: string;
  timestamp: string;
  result: string;
  logs: string;
};

export default function TestRunsPage() {
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchTestRuns() {
      try {
        const response = await fetch('/api/test-runs');
        if (!response.ok) {
          throw new Error('Failed to fetch test runs');
        }
        const data: TestRun[] = await response.json();
        setTestRuns(data);
      } catch (error) {
        console.error((error as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchTestRuns();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (testRuns.length === 0) {
    return <div>No test runs found.</div>;
  }

  return (
    <div>
      <h1>Conformance Test Runs</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Timestamp</th>
            <th>Result</th>
            <th>Logs</th>
          </tr>
        </thead>
        <tbody>
          {testRuns.map((run) => (
            <tr key={run.id}>
              <td>{run.id}</td>
              <td>{new Date(run.timestamp).toLocaleString()}</td>
              <td>{run.result}</td>
              <td>
                <pre>{run.logs}</pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
