import { useState } from 'react';

interface TeamsChannel {
  name: string;
}

interface TeamsChannelModalProps {
  channels: TeamsChannel[];
  articleTitle: string;
  articleSummary: string;
  onClose: () => void;
  onSend: (channelName: string) => void;
  isSending?: boolean;
}

export default function TeamsChannelModal({
  channels,
  articleTitle,
  articleSummary,
  onClose,
  onSend,
  isSending
}: TeamsChannelModalProps) {
  const [selectedChannel, setSelectedChannel] = useState<string>(channels[0]?.name || '');

  const handleSend = () => {
    if (selectedChannel) {
      onSend(selectedChannel);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content teams-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Send to Microsoft Teams</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Select a channel:</label>
            <div className="channel-list">
              {channels.map((channel) => (
                <label key={channel.name} className="channel-option">
                  <input
                    type="radio"
                    name="channel"
                    value={channel.name}
                    checked={selectedChannel === channel.name}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                  />
                  <span>#{channel.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="article-preview">
            <h4>Article Preview</h4>
            <div className="preview-content">
              <strong>{articleTitle}</strong>
              <p>{articleSummary}</p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={isSending}>
            Cancel
          </button>
          <button
            className="btn-primary btn-teams"
            onClick={handleSend}
            disabled={!selectedChannel || isSending}
          >
            {isSending ? 'Sending...' : 'Send to Teams'}
          </button>
        </div>
      </div>
    </div>
  );
}
