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

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-4">
                    <div className="glass-card max-w-md w-full p-8 text-center space-y-6 border border-status-error/20 shadow-glow">
                        <div className="h-16 w-16 bg-status-error/10 rounded-full flex items-center justify-center mx-auto text-status-error">
                            <AlertCircle className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-xl font-bold tracking-tight">Something went wrong</h1>
                            <p className="text-sm text-muted-foreground">
                                An unexpected error occurred while rendering this page.
                            </p>
                            {this.state.error && (
                                <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs font-mono text-status-error text-left overflow-auto max-h-32">
                                    {this.state.error.message}
                                </div>
                            )}
                        </div>
                        <Button
                            className="w-full gap-2"
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Refresh Application
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
