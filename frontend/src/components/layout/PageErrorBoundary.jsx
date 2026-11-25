import { Component } from "react";
import Button from "../ui/Button.jsx";

export default class PageErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="route-status">
          <section className="panel route-error" role="alert">
            <h1>This page couldn’t load</h1>
            <p>Reload the page to try again.</p>
            <Button onClick={() => window.location.reload()}>Reload page</Button>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}
