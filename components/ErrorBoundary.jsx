import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <h2 className="text-xl font-bold text-red-600 mb-2">エラーが発生しました</h2>
            <p className="text-sm text-slate-600 mb-4">{this.state.error?.message || '不明なエラー'}</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.hash = '/'; }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors min-h-[44px]"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
