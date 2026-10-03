// Copies the repo's brand kit (../brand, ADR-042) into public/brand so /brand/mangrove.css, textures,
// icons and logos are served (brand/WEB.md §1.4). The copy is committed because the Docker build context
// is web/ only; this script keeps it in step with ../brand on every dev run and build.
// Reference-only folders (deck slides, generator scripts, logo sources) are not shipped.
import { cpSync, existsSync, rmSync } from "node:fs";
import { join, relative, sep } from "node:path";

const from = "../brand";
const to = "public/brand";
const SKIP = new Set(["slides", "scripts", join("logo", "source")]);

if (!existsSync(from)) {
  console.log("sync-brand: ../brand not found, keeping the committed public/brand copy.");
  process.exit(0);
}
rmSync(to, { recursive: true, force: true });
cpSync(from, to, {
  recursive: true,
  filter: (src) => {
    const rel = relative(from, src);
    return !rel || ![...SKIP].some((s) => rel === s || rel.startsWith(s + sep));
  },
});
console.log("sync-brand: copied ../brand -> public/brand");
