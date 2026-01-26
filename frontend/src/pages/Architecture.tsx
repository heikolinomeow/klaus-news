import SettingsNav from '../components/SettingsNav';

export default function Architecture() {
  return (
    <div className="settings-container">
      <h1>Settings</h1>
      <SettingsNav />

      <div className="architecture-container">
        <h2>System Architecture</h2>

        <div className="architecture-flow">
          <div className="flow-stage">
            <div className="flow-box data-source">
              <h3>Data Sources</h3>
              <p>X/Twitter Lists</p>
            </div>
            <div className="flow-arrow">↓</div>
          </div>

          <div className="flow-stage">
            <div className="flow-box ingestion">
              <h3>Background Scheduler</h3>
              <p>Runs every 30 minutes</p>
              <p>Fetches 5 posts per list</p>
            </div>
            <div className="flow-arrow">↓</div>
          </div>

          <div className="flow-stage">
            <div className="flow-box-group">
              <div className="flow-box ai-processing">
                <h3>AI Processing (OpenAI)</h3>
                <ul>
                  <li>Categorization (Technology, Politics, etc.)</li>
                  <li>Title Generation</li>
                  <li>Summary Generation</li>
                  <li>Worthiness Scoring</li>
                  <li>Duplicate Detection</li>
                </ul>
              </div>
              <div className="flow-box duplicate-check">
                <h3>Duplicate Detection</h3>
                <ul>
                  <li>AI Semantic Title Comparison</li>
                  <li>Configurable similarity threshold</li>
                </ul>
              </div>
            </div>
            <div className="flow-arrow">↓</div>
          </div>

          <div className="flow-stage">
            <div className="flow-box database">
              <h3>PostgreSQL Database</h3>
              <p>Posts, Articles, Lists, Settings</p>
            </div>
            <div className="flow-arrow">↓</div>
          </div>

          <div className="flow-stage">
            <div className="flow-box-group">
              <div className="flow-box frontend">
                <h3>Frontend (React)</h3>
                <ul>
                  <li>Post Browsing</li>
                  <li>Recommended View</li>
                  <li>Settings Management</li>
                </ul>
              </div>
              <div className="flow-box teams">
                <h3>Teams Integration</h3>
                <p>Publish articles to Microsoft Teams</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
