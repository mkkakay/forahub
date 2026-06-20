// Short-URL bridge so /orgs/<slug> shares route to the public org page
// at /organizations/<slug>. This is the URL pattern surfaced in some
// share-from-clipboard flows; the manage page lives at
// /orgs/<slug>/manage.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function OrgShortRedirect({ params }: { params: { slug: string } }) {
  redirect(`/organizations/${params.slug}`);
}
