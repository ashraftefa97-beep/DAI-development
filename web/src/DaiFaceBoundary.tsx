import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

export default class DaiFaceBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('DAI face fallback activated', {
      name: error.name,
      componentStack: info.componentStack?.slice(0, 500),
    });
  }

  render() {
    if (this.state.failed) {
      return (
        <div className='dai-face-fallback' role='img' aria-label='ضي'>
          <img src='./dai-logo.svg' alt='' width={180} height={180} />
        </div>
      );
    }
    return this.props.children;
  }
}
