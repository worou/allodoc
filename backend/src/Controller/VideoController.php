<?php

namespace App\Controller;

use App\Entity\Appointment;
use App\Service\VideoConsultation;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Uuid;

/**
 * Accès à la téléconsultation : réservé au patient et au praticien du rendez-vous. La salle Jitsi n'est communiquée
 * que pendant la fenêtre d'ouverture ; chaque accès est journalisé.
 */
final class VideoController extends ApiController
{
    #[Route('/api/appointments/{id}/video', methods: ['GET'])]
    #[IsGranted('ROLE_PATIENT')]
    public function join(string $id, Request $request, VideoConsultation $videos): JsonResponse
    {
        $appointment = Uuid::isValid($id) ? $this->em->getRepository(Appointment::class)->find(Uuid::fromString($id)) : null;
        $user = $this->currentUser();
        if (null === $appointment || !$appointment->isVideo() || !$videos->isParticipant($appointment, $user)) {
            return $this->error('Téléconsultation introuvable.', 404);
        }

        $data = $videos->joinData($appointment, $user);
        if ($data['open']) {
            $this->audit($request, 'appointment.video.join', 'appointment:'.$id);
            $this->em->flush();
        }

        return $this->json($data + [
            'status' => $appointment->getStatus()->value,
            'practitioner' => $appointment->getPractitioner()->getFullName(),
        ]);
    }
}
