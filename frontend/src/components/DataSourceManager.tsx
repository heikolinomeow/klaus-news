import { useState, useEffect } from 'react';
import { listsApi } from '../services/api';
import { formatRelativeTime, getTimestampColor } from '../utils/timeFormat';

interface List {
  id: number;
  list_id: string;
  list_name: string;
  description: string;
  enabled: boolean;
  updated_at: string;
}

export default function DataSourceManager() {
  const [lists, setLists] = useState<List[]>([]);
  const [newListId, setNewListId] = useState('');
  const [newListName, setNewListName] = useState('');
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      const response = await listsApi.getAll();
      setLists(response.data.lists);
    } catch (error) {
      console.error('Failed to load lists:', error);
    }
  };

  const testConnection = async () => {
    if (!newListId) return;

    setLoading(true);
    setTestResult(null);

    try {
      // Create temporary list to test
      const response = await listsApi.create({ list_id: newListId, list_name: newListName || `List ${newListId}` });
      const listId = response.data.list.id;

      // Test connectivity
      const testResponse = await listsApi.test(listId);
      setTestResult(testResponse.data);

      // If test failed, delete the temporary list
      if (!testResponse.data.valid) {
        await listsApi.delete(listId);
      } else {
        // Success - reload lists
        loadLists();
        setNewListId('');
        setNewListName('');
      }
    } catch (error) {
      setTestResult({ valid: false, message: 'Connection test failed' });
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async (id: number, currentEnabled: boolean) => {
    try {
      await listsApi.update(id, { enabled: !currentEnabled });
      loadLists();
    } catch (error) {
      console.error('Failed to toggle list:', error);
    }
  };

  const deleteList = async (id: number) => {
    if (!confirm('Are you sure you want to remove this list?')) return;

    try {
      await listsApi.delete(id);
      loadLists();
    } catch (error) {
      console.error('Failed to delete list:', error);
    }
  };

  return (
    <div className="data-source-manager">
      <div className="data-source-header">
        <h3>X/Twitter Lists</h3>
        <div className="data-source-actions">
          <button className="btn-secondary">Import Lists</button>
          <button className="btn-secondary">Export Lists</button>
        </div>
      </div>

      <div className="add-list-form">
        <h4>+ Add New List</h4>
        <input
          type="text"
          placeholder="List ID (e.g., 1234567890)"
          value={newListId}
          onChange={(e) => setNewListId(e.target.value)}
        />
        <input
          type="text"
          placeholder="List Name (optional)"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
        />
        <button onClick={testConnection} disabled={!newListId || loading}>
          {loading ? 'Testing...' : 'Test Connection'}
        </button>

        {testResult && (
          <div className={`test-result ${testResult.valid ? 'valid' : 'error'}`}>
            {testResult.valid ? '✓' : '✗'} {testResult.message}
          </div>
        )}
      </div>

      <div className="lists-table">
        <table>
          <thead>
            <tr>
              <th>List ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>Last Fetch</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {lists.map((list) => (
              <tr key={list.id}>
                <td>{list.list_id}</td>
                <td>{list.list_name}</td>
                <td>
                  <span className={list.enabled ? 'enabled' : 'disabled'}>
                    {list.enabled ? '✓ Enabled' : '○ Disabled'}
                  </span>
                </td>
                <td>
                  {list.updated_at ? (
                    <span style={{ color: getTimestampColor(list.updated_at) }}>
                      Last fetch: {formatRelativeTime(list.updated_at)}
                    </span>
                  ) : 'Never'}
                </td>
                <td>
                  <button onClick={() => toggleEnabled(list.id, list.enabled)}>
                    {list.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => deleteList(list.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
