import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, LogIn } from "lucide-react";

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
    console.error("ErrorBoundary ha capturado un error no controlado:", error, errorInfo);
  }

  private handleReset = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#06121f] p-4 text-white">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 grid place-items-center text-red-400">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Ocurrió un inconveniente al renderizar</h2>
              <p className="mt-1 text-xs text-slate-400">
                {this.state.error?.message || "Error inesperado de ejecución en la interfaz."}
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <RefreshCw size={15} /> Recargar página
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <LogIn size={15} /> Reiniciar sesión e ir al Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
