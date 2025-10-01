'use client';

import { ContactProfile } from "@/components/contacts/contact-profile";
import type { PageProps } from "@/lib/types";

export default function ContactDetailsPage({ params }: PageProps<{ contactId: string }>) {
  return (
    <ContactProfile contactId={params.contactId} />
  );
}
