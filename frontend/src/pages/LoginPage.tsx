import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, gql } from '@apollo/client';
import { Leaf, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../lib/auth.js';

const LOGIN_M = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user { id email name role organizationId }
    }
  }
`;

const REGISTER_M = gql`
  mutation Register(
    $email: String!, $name: String!, $password: String!,
    $orgName: String!, $orgCode: String!
  ) {
    register(email: $email, name: $name, password: $password, orgName: $orgName, orgCode: $orgCode) {
      token
      user { id email name role organizationId }
    }
  }
`;

export function LoginPage() {
  const navigate    = useNavigate();
  const { login }   = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');

  // login form
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // register extras
  const [name, setName]       = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');

  const [doLogin,    { loading: l1 }] = useMutation(LOGIN_M);
  const [doRegister, { loading: l2 }] = useMutation(REGISTER_M);
  const loading = l1 || l2;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      if (mode === 'login') {
        const { data } = await doLogin({ variables: { email, password } });
        login(data.login.token, data.login.user);
      } else {
        const { data } = await doRegister({ variables: { email, name, password, orgName, orgCode } });
        login(data.register.token, data.register.user);
      }
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      setErr(e.message?.replace('GraphQL error: ', '') || 'Something went wrong');
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">CarbonX</span>
          </div>
          <p className="text-gray-500 text-sm">Maritime Carbon Compliance Suite</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {/* Tab switcher */}
          <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setErr(''); }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mode === m ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Full Name</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  required minLength={2} placeholder="Jane Smith"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="you@company.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required minLength={mode === 'register' ? 8 : 1}
                  placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Company Name</label>
                  <input
                    type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
                    required placeholder="ANKR Shipping Ltd"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Company Code <span className="text-gray-600">(short unique identifier)</span></label>
                  <input
                    type="text" value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                    required maxLength={16} placeholder="ANKR_SHIP"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </>
            )}

            {err && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400">
                {err}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span className="animate-spin text-base">⚙</span>
              ) : mode === 'login' ? (
                <><LogIn className="h-4 w-4" /> Sign In</>
              ) : (
                <><UserPlus className="h-4 w-4" /> Create Account</>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <p className="text-center text-xs text-gray-600 mt-4">
              Demo: <span className="text-gray-400 font-mono">admin@carbonx.ankr.in</span> / <span className="text-gray-400 font-mono">Admin1234!</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
