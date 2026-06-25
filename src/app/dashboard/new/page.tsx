import { VehicleRegistrationForm } from "@/components/vehicles/vehicle-registration-form";
import { PageHeader } from "@/components/ui/page-header";
import { WorkflowSteps } from "@/components/ui/workflow-steps";

export default function NewVehiclePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="차량 등록"
        description="기본 정보를 입력한 후 사진을 업로드하고 AI 분석을 진행하세요."
      />
      <WorkflowSteps
        steps={[
          { id: "1", label: "기본 정보", done: false, current: true },
          { id: "2", label: "사진 업로드", done: false },
          { id: "3", label: "AI 분석", done: false },
          { id: "4", label: "판매글 생성", done: false },
        ]}
      />
      <VehicleRegistrationForm />
    </div>
  );
}
