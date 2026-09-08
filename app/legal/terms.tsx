import { LegalDocumentScreen } from '../../src/components/LegalDocumentScreen';
import { TERMS_OF_USE } from '../../src/constants/legal';

export default function TermsOfUseScreen() {
  return <LegalDocumentScreen doc={TERMS_OF_USE} />;
}
