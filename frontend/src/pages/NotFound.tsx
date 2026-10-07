import { Link } from "react-router";
import { Icon } from "../components/Icon";
import { useTitle } from "../lib/hooks";

export default function NotFound() {
  useTitle("Page introuvable");
  return (
    <div className="funnel">
      <div className="card empty">
        <Icon name="pin" size={44} />
        <h1 style={{ fontSize: 26, margin: "8px 0" }}>Page introuvable</h1>
        <p className="muted">Cette adresse n&apos;existe pas ou plus.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
