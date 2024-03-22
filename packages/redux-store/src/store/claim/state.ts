import { Claim, ViewClaimDto } from '@bcpros/lixi-models';
import { EntityState } from '@reduxjs/toolkit';

export interface ClaimsState extends EntityState<Claim, number> {
  currentAddress: string;
  currentClaimCode: string;
  currentLixiClaim?: Nullable<ViewClaimDto>;
}
