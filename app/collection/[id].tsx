import { Redirect, useLocalSearchParams } from 'expo-router';

/** Legacy `/collection/[id]` route — keep so old links still open the live collections screen. */
export default function CollectionAliasScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const collectionId = Array.isArray(id) ? id[0] : id;
  if (!collectionId) {
    return <Redirect href="/(tabs)/collections" />;
  }
  return (
    <Redirect
      href={{
        pathname: '/collections/[id]',
        params: { id: collectionId },
      }}
    />
  );
}
