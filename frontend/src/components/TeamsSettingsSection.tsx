import { useState, useEffect } from 'react';
import { teamsApi } from '../services/api';

interface TeamsChannel {
  name: string;
  status?: string;
}

export default function TeamsSettingsSection() {
  const [channels, setChannels] = useState<TeamsChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const response = await teamsApi.getChannels();
      setChannels(response.data.channels.map((ch: any) => ({ ...ch, status: 'Connected' })));
    } catch (error) {
      console.error('Failed to load Teams channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAll = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await teamsApi.testChannels();
      setTestResult(response.data.success ? '✓ All connections verified' : '✗ Some connections failed');
    } catch (error) {
      setTestResult('✗ Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="teams-section-loading">Loading...</div>;
  }

  return (
    <div className="teams-settings-section">
      <h4>Microsoft Teams Integration</h4>

      {channels.length > 0 ? (
        <>
          <div className="channels-table-container">
            <table className="channels-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((channel) => (
                  <tr key={channel.name}>
                    <td>#{channel.name}</td>
                    <td className="status-connected">✓ {channel.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className="btn-secondary"
            onClick={handleTestAll}
            disabled={testing}
            style={{ marginTop: '12px' }}
          >
            {testing ? 'Testing...' : 'Test All Connections'}
          </button>

          {testResult && (
            <div className={`test-result ${testResult.includes('✓') ? 'success' : 'error'}`}>
              {testResult}
            </div>
          )}

          <p className="help-text" style={{ marginTop: '16px' }}>
            ℹ️ Channels are configured via environment variables. Contact your administrator to add or remove channels.
          </p>
        </>
      ) : (
        <div className="teams-empty-state">
          <span className="warning-icon">⚠️</span>
          <p>No channels configured</p>
          <p className="help-text">
            To enable Teams integration, add webhook URLs to your environment configuration.
          </p>
        </div>
      )}
    </div>
  );
}
