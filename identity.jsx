/* ============================================================
   Sensi World Cup — identity React layer
   useIdentity(): loads current user + roster from IdentityProvider.
   ============================================================ */

function useIdentity() {
  const [user, setUser] = React.useState(null);
  const [players, setPlayers] = React.useState(() => window.PLAYERS || []);
  const [departments, setDepartments] = React.useState(() => window.DEPARTMENTS || []);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let on = true;
    Promise.all([window.IdentityProvider.getCurrentUser(), window.IdentityProvider.getRoster()])
      .then(([u, r]) => {
        if (!on) return;
        setUser(u); setPlayers(r.players); setDepartments(r.departments); setLoading(false);
      })
      .catch((e) => { if (on) { setError(e.message || 'identity error'); setLoading(false); } });
    return () => { on = false; };
  }, []);

  return { user, players, departments, loading, error, mode: window.IdentityProvider.MODE };
}

window.useIdentity = useIdentity;
