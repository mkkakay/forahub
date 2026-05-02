import AddEventForm from '@/components/admin/AddEventForm'

export default function NewEventPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Add Event</h1>
        <p className="text-blue-400 text-sm mt-0.5">Manually add a new event to ForaHub</p>
      </div>
      <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl p-6">
        <AddEventForm />
      </div>
    </div>
  )
}
