import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = "/";
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-4 antialiased">
                    <div className="glass-card max-w-md w-full p-8 text-center space-y-6 border border-status-error/20 animate-fade-in">
                        <div className="h-16 w-16 bg-status-error/10 rounded-full flex items-center justify-center mx-auto text-status-error">
                            <AlertCircle className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-xl font-bold tracking-tight text-foreground">Application Error</h1>
                            <p className="text-sm text-muted-foreground">
                                We've encountered an unexpected issue. Please try refreshing or returning to home.
                            </p>
                            {this.state.error && (
                                <div className="mt-4 p-4 bg-muted/30 rounded-lg text-xs font-mono text-status-error text-left overflow-auto max-h-40 border border-border/50">
                                    {this.state.error.name}: {this.state.error.message}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button
                                variant="outline"
                                className="w-full gap-2"
                                onClick={() => window.location.reload()}
                            >
                                <RefreshCcw className="h-4 w-4" />
                                Refresh
                            </Button>
                            <Button
                                className="w-full"
                                onClick={this.handleReset}
                            >
                                Go to Home
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
