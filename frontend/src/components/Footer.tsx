import { Link } from "react-router";
import { LogoMark } from "./Logo";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="kente-band" />
      <div className="container">
        <div>
          <div className="brand" style={{ color: "#fff", marginBottom: 10 }}>
            <LogoMark size={30} />
            <span>
              Allo<b>Doc</b>
            </span>
          </div>
          <p className="small">Votre rendez-vous médical au Mali, au Burkina Faso et au Niger, en quelques secondes.</p>
        </div>
        <div>
          <h4>Pays</h4>
          <ul>
            <li><Link to="/ml">Mali</Link></li>
            <li><Link to="/bf">Burkina Faso</Link></li>
            <li><Link to="/ne">Niger</Link></li>
          </ul>
        </div>
        <div>
          <h4>Patients</h4>
          <ul>
            <li><Link to="/recherche">Trouver un praticien</Link></li>
            <li><Link to="/compte">Mes rendez-vous</Link></li>
            <li><Link to="/connexion">Se connecter</Link></li>
            <li><Link to="/application">Application mobile</Link></li>
          </ul>
        </div>
        <div>
          <h4>Professionnels</h4>
          <ul>
            <li><Link to="/pro">Espace praticien</Link></li>
            <li><Link to="/admin">Administration</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-legal">
        Données de santé protégées : chiffrement, journal d&apos;audit, aucune information médicale dans les SMS. Démonstration : praticiens et structures fictifs.
      </div>
    </footer>
  );
}
