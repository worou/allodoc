<?php

namespace App\Enum;

enum SubscriptionStatus: string
{
    /** Commande créée, paiement en attente de confirmation. */
    case Pending = 'pending';
    /** Payé : la période [startsAt, endsAt[ ouvre la publication. */
    case Paid = 'paid';
    /** Commande abandonnée ou paiement refusé. */
    case Cancelled = 'cancelled';
}
