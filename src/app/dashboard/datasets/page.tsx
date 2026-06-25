import { AihubExplorer } from "@/components/aihub/aihub-explorer";
import { PageHeader } from "@/components/ui/page-header";

export default function DatasetsPage() {
  return (
    <div>
      <PageHeader
        title="AI Hub 데이터"
        description="AI 허브 오픈 API(aihubshell)로 학습용 데이터셋을 조회하고 다운로드합니다."
      />
      <AihubExplorer />
    </div>
  );
}
